const SharedMember = require('../models/SharedMember');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const NotificationService = require('../utils/notificationService');
const { 
  sendSharedMemberSubmissionNotification, 
  sendSharedMemberApprovedNotification, 
  sendSharedMemberRejectedNotification 
} = require('../utils/emailService');
const User = require('../models/User');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

// Create a new shared member (User, Admin, SuperAdmin)
const createSharedMember = async (req, res) => {
  try {
    const { name, email, mobileNumber, aadharNumber, panNumber, kycDocuments, ticketid, userid } = req.body;
    
    // Debug logging
    logger(`Creating shared member with data: ${JSON.stringify(req.body)}`);
    logger(`User info: ${JSON.stringify(req.user)}`);

    // Validate required fields
    if (!name || !email || !mobileNumber || !aadharNumber || !panNumber) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Missing required fields: name, email, mobileNumber, aadharNumber, and panNumber are required'
      });
    }

    // Validate user authentication
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({
        status: 'failed',
        body: {},
        message: 'Authentication required'
      });
    }

    // Check if shared member already exists with same email, mobile, aadhar, or PAN
    const existingMember = await SharedMember.findOne({
      $or: [
        { email: email.toLowerCase() },
        { mobileNumber },
        { aadharNumber },
        { panNumber: panNumber.toUpperCase() }
      ]
    });

    if (existingMember) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Shared member already exists with this email, mobile, Aadhar, or PAN number'
      });
    }

    const sharedMember = new SharedMember({
      name,
      email: email.toLowerCase(),
      mobileNumber,
      aadharNumber,
      panNumber: panNumber.toUpperCase(),
      kycDocuments: kycDocuments || [],
      ticketid: (ticketid && ticketid !== '') ? ticketid : null,
      userid: (userid && userid !== '') ? userid : null,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 
                     req.user.role === 'admin' ? 'Admin' : 
                     req.user.role === 'user' ? 'User' : 'User'
    });

    await sharedMember.save();

    // Send notifications to admins and superadmins
    try {
      // Get creator details for notification
      let creatorDetails = {};
      if (req.user.role === 'user') {
        creatorDetails = await User.findById(req.user.id).select('name email');
      } else if (req.user.role === 'admin') {
        creatorDetails = await Admin.findById(req.user.id).select('name email');
      } else if (req.user.role === 'superadmin') {
        creatorDetails = await SuperAdmin.findById(req.user.id).select('name email');
      }

      // Create internal notifications for all admins and superadmins
      await NotificationService.createAdminNotification(
        'shared_member_submission',
        'New Shared Member Submission',
        `A new shared member "${name}" has been submitted by ${creatorDetails.name || creatorDetails.email}. Please review the submission.`,
        {
          sharedMemberId: sharedMember._id,
          memberName: name,
          memberEmail: email,
          submittedBy: creatorDetails.name || creatorDetails.email,
          submittedByRole: req.user.role
        },
        sharedMember._id,
        'SharedMember'
      );

      // Send email notifications to all admins and superadmins
      const [admins, superAdmins] = await Promise.all([
        Admin.find({}).select('name email'),
        SuperAdmin.find({}).select('name email')
      ]);

      // Send emails to admins
      for (const admin of admins) {
        try {
          await sendSharedMemberSubmissionNotification(admin, sharedMember, creatorDetails);
        } catch (emailError) {
          logger(`Error sending email to admin ${admin.email}: ${emailError.message}`);
        }
      }

      // Send emails to superadmins
      for (const superAdmin of superAdmins) {
        try {
          await sendSharedMemberSubmissionNotification(superAdmin, sharedMember, creatorDetails);
        } catch (emailError) {
          logger(`Error sending email to superadmin ${superAdmin.email}: ${emailError.message}`);
        }
      }

      logger(`Notifications sent for shared member submission: ${sharedMember._id}`);
    } catch (notificationError) {
      logger(`Error sending notifications for shared member submission: ${notificationError.message}`);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      status: 'success',
      body: { sharedMember },
      message: 'Shared member created successfully'
    });
  } catch (error) {
    logger(`Error in createSharedMember: ${error.message}`);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: `Validation error: ${validationErrors.join(', ')}`
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Shared member already exists with this email, mobile, Aadhar, or PAN number'
      });
    }
    
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all shared members created by user (User only)
const getMySharedMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { createdBy: req.user.id };
    if (status) {
      query.status = status;
    }

    const sharedMembers = await SharedMember.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SharedMember.countDocuments(query);

    res.json({
      status: 'success',
      body: { 
        sharedMembers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      message: 'Shared members retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getMySharedMembers: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all shared members (Admin and SuperAdmin only)
const getAllSharedMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sharedMembers = await SharedMember.find(query)
      .populate('createdBy', 'name email')
      .populate('ticketid', 'ticketcustomid ticketprice ticketstatus')
      .populate('userid', 'name email phone')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SharedMember.countDocuments(query);

    res.json({
      status: 'success',
      body: { 
        sharedMembers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      message: 'All shared members retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAllSharedMembers: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get shared member by ID
const getSharedMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const sharedMember = await SharedMember.findById(id)
      .populate('createdBy', 'name email')
      .populate('ticketid', 'ticketcustomid ticketprice ticketstatus')
      .populate('userid', 'name email phone');

    if (!sharedMember) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check if user can access this shared member
    if (req.user.role === 'user' && sharedMember.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. You can only view shared members you created.'
      });
    }

    res.json({
      status: 'success',
      body: { sharedMember },
      message: 'Shared member retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSharedMemberById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update shared member (Admin and SuperAdmin only)
const updateSharedMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, aadharNumber, panNumber, kycDocuments, status, rejectedComments, ticketid, userid } = req.body;

    const sharedMember = await SharedMember.findById(id);
    if (!sharedMember) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check for duplicate data (excluding current record)
    if (email || mobileNumber || aadharNumber || panNumber) {
      const duplicateQuery = {
        _id: { $ne: id },
        $or: []
      };

      if (email) duplicateQuery.$or.push({ email: email.toLowerCase() });
      if (mobileNumber) duplicateQuery.$or.push({ mobileNumber });
      if (aadharNumber) duplicateQuery.$or.push({ aadharNumber });
      if (panNumber) duplicateQuery.$or.push({ panNumber: panNumber.toUpperCase() });

      const existingMember = await SharedMember.findOne(duplicateQuery);
      if (existingMember) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Another shared member already exists with this email, mobile, Aadhar, or PAN number'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (mobileNumber) updateData.mobileNumber = mobileNumber;
    if (aadharNumber) updateData.aadharNumber = aadharNumber;
    if (panNumber) updateData.panNumber = panNumber.toUpperCase();
    if (kycDocuments) updateData.kycDocuments = kycDocuments;
    if (status) updateData.status = status;
    if (rejectedComments !== undefined) updateData.rejectedComments = rejectedComments;
    if (ticketid !== undefined) updateData.ticketid = ticketid;
    if (userid !== undefined) updateData.userid = userid;

    const updatedSharedMember = await SharedMember.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('ticketid', 'ticketcustomid ticketprice ticketstatus')
    .populate('userid', 'name email phone');

    res.json({
      status: 'success',
      body: { sharedMember: updatedSharedMember },
      message: 'Shared member updated successfully'
    });
  } catch (error) {
    logger(`Error in updateSharedMember: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete shared member (User can delete their own, Admin and SuperAdmin can delete any)
const deleteSharedMember = async (req, res) => {
  try {
    const { id } = req.params;
    const sharedMember = await SharedMember.findById(id);

    if (!sharedMember) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check if user can delete this shared member
    if (req.user.role === 'user' && sharedMember.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. You can only delete shared members you created.'
      });
    }

    await SharedMember.findByIdAndDelete(id);

    res.json({
      status: 'success',
      body: {},
      message: 'Shared member deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteSharedMember: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update shared member status (Admin and SuperAdmin only)
const updateSharedMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedComments } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid status. Must be pending, accepted, or rejected'
      });
    }

    const updateData = { status };
    if (status === 'rejected' && rejectedComments) {
      updateData.rejectedComments = rejectedComments;
    } else if (status !== 'rejected') {
      updateData.rejectedComments = undefined;
    }

    const sharedMember = await SharedMember.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('ticketid', 'ticketcustomid ticketprice ticketstatus')
    .populate('userid', 'name email phone');

    if (!sharedMember) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Send notifications to the user who created the shared member
    if (sharedMember.createdBy) {
      try {
        // Get approver/rejector details
        let approverDetails = {};
        if (req.user.role === 'admin') {
          approverDetails = await Admin.findById(req.user.id).select('name email');
        } else if (req.user.role === 'superadmin') {
          approverDetails = await SuperAdmin.findById(req.user.id).select('name email');
        }

        // Create internal notification for the user
        await NotificationService.createUserNotification(
          sharedMember.createdBy._id,
          status === 'accepted' ? 'shared_member_approved' : 'shared_member_rejected',
          status === 'accepted' ? 'Shared Member Approved' : 'Shared Member Rejected',
          status === 'accepted' 
            ? `Your shared member "${sharedMember.name}" has been approved and is now active.`
            : `Your shared member "${sharedMember.name}" has been rejected. ${rejectedComments ? 'Reason: ' + rejectedComments : ''}`,
          {
            sharedMemberId: sharedMember._id,
            memberName: sharedMember.name,
            memberEmail: sharedMember.email,
            status: status,
            rejectedComments: rejectedComments,
            approvedBy: approverDetails.name || approverDetails.email
          },
          sharedMember._id,
          'SharedMember'
        );

        // Send email notification to the user
        if (status === 'accepted') {
          await sendSharedMemberApprovedNotification(sharedMember.createdBy, sharedMember, approverDetails);
        } else {
          await sendSharedMemberRejectedNotification(sharedMember.createdBy, sharedMember, approverDetails, rejectedComments);
        }

        logger(`Notifications sent for shared member ${status}: ${sharedMember._id}`);
      } catch (notificationError) {
        logger(`Error sending notifications for shared member ${status}: ${notificationError.message}`);
        // Don't fail the request if notifications fail
      }
    }

    res.json({
      status: 'success',
      body: { sharedMember },
      message: 'Shared member status updated successfully'
    });
  } catch (error) {
    logger(`Error in updateSharedMemberStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get shared member statistics (Admin and SuperAdmin only)
const getSharedMemberStats = async (req, res) => {
  try {
    const stats = await SharedMember.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await SharedMember.countDocuments();
    const recent = await SharedMember.countDocuments({
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const statusCounts = {
      pending: 0,
      accepted: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.json({
      status: 'success',
      body: {
        total,
        recent,
        statusCounts
      },
      message: 'Shared member statistics retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSharedMemberStats: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Upload KYC document for shared member
const uploadKycDocument = async (req, res) => {
  try {
    const { sharedMemberId } = req.params;
    const { documentType } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No file uploaded'
      });
    }

    // Validate document type
    const allowedTypes = ['aadhar_front', 'aadhar_back', 'pan_card', 'passport', 'driving_license', 'other'];
    if (!documentType || !allowedTypes.includes(documentType)) {
      // Delete the uploaded file if document type is invalid
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid document type. Must be one of: ' + allowedTypes.join(', ')
      });
    }

    // Check if shared member exists
    const sharedMember = await SharedMember.findById(sharedMemberId);
    if (!sharedMember) {
      // Delete the uploaded file if shared member not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check if user can access this shared member
    if (req.user.role === 'user' && sharedMember.createdBy.toString() !== req.user.id) {
      // Delete the uploaded file if access denied
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. You can only upload documents for shared members you created.'
      });
    }

    try {
      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'shared-member-documents',
        resource_type: 'auto',
        public_id: `shared_member_${sharedMemberId}_${documentType}_${Date.now()}`,
        format: req.file.mimetype === 'application/pdf' ? 'pdf' : 'auto'
      });

      // Delete temporary file after successful upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Add document to shared member's kycDocuments array
      const newDocument = {
        documentType,
        documentUrl: result.secure_url,
        publicId: result.public_id,
        uploadedAt: new Date()
      };

      sharedMember.kycDocuments.push(newDocument);
      await sharedMember.save();

      logger(`KYC document uploaded successfully for shared member ${sharedMemberId}: ${result.secure_url}`);

      res.status(200).json({
        status: 'success',
        body: {
          document: newDocument,
          sharedMember: sharedMember
        },
        message: 'Document uploaded successfully'
      });
    } catch (uploadError) {
      logger(`Error uploading to Cloudinary: ${uploadError.message}`);
      
      // Delete temporary file if upload failed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        status: 'failed',
        body: {},
        message: 'Failed to upload document to cloud storage'
      });
    }
  } catch (error) {
    logger(`Error in uploadKycDocument: ${error.message}`);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update KYC document for shared member
const updateKycDocument = async (req, res) => {
  try {
    const { sharedMemberId, documentId } = req.params;
    const { documentType } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No file uploaded'
      });
    }

    // Validate document type
    const allowedTypes = ['aadhar_front', 'aadhar_back', 'pan_card', 'passport', 'driving_license', 'other'];
    if (!documentType || !allowedTypes.includes(documentType)) {
      // Delete the uploaded file if document type is invalid
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid document type. Must be one of: ' + allowedTypes.join(', ')
      });
    }

    // Check if shared member exists
    const sharedMember = await SharedMember.findById(sharedMemberId);
    if (!sharedMember) {
      // Delete the uploaded file if shared member not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check if user can access this shared member
    if (req.user.role === 'user' && sharedMember.createdBy.toString() !== req.user.id) {
      // Delete the uploaded file if access denied
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. You can only update documents for shared members you created.'
      });
    }

    // Find the document to update
    const documentIndex = sharedMember.kycDocuments.findIndex(doc => doc._id.toString() === documentId);
    if (documentIndex === -1) {
      // Delete the uploaded file if document not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Document not found'
      });
    }

    const oldDocument = sharedMember.kycDocuments[documentIndex];

    try {
      // Upload new file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'shared-member-documents',
        resource_type: 'auto',
        public_id: `shared_member_${sharedMemberId}_${documentType}_${Date.now()}`,
        format: req.file.mimetype === 'application/pdf' ? 'pdf' : 'auto'
      });

      // Delete old document from Cloudinary
      if (oldDocument.publicId) {
        try {
          await cloudinary.uploader.destroy(oldDocument.publicId);
        } catch (deleteError) {
          logger(`Warning: Could not delete old document from Cloudinary: ${deleteError.message}`);
        }
      }

      // Delete temporary file after successful upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Update document in shared member's kycDocuments array
      sharedMember.kycDocuments[documentIndex] = {
        documentType,
        documentUrl: result.secure_url,
        publicId: result.public_id,
        uploadedAt: new Date()
      };

      await sharedMember.save();

      logger(`KYC document updated successfully for shared member ${sharedMemberId}: ${result.secure_url}`);

      res.status(200).json({
        status: 'success',
        body: {
          document: sharedMember.kycDocuments[documentIndex],
          sharedMember: sharedMember
        },
        message: 'Document updated successfully'
      });
    } catch (uploadError) {
      logger(`Error uploading to Cloudinary: ${uploadError.message}`);
      
      // Delete temporary file if upload failed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        status: 'failed',
        body: {},
        message: 'Failed to upload document to cloud storage'
      });
    }
  } catch (error) {
    logger(`Error in updateKycDocument: ${error.message}`);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete KYC document for shared member
const deleteKycDocument = async (req, res) => {
  try {
    const { sharedMemberId, documentId } = req.params;

    // Check if shared member exists
    const sharedMember = await SharedMember.findById(sharedMemberId);
    if (!sharedMember) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Shared member not found'
      });
    }

    // Check if user can access this shared member
    if (req.user.role === 'user' && sharedMember.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. You can only delete documents for shared members you created.'
      });
    }

    // Find the document to delete
    const documentIndex = sharedMember.kycDocuments.findIndex(doc => doc._id.toString() === documentId);
    if (documentIndex === -1) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Document not found'
      });
    }

    const document = sharedMember.kycDocuments[documentIndex];

    // Delete document from Cloudinary
    if (document.publicId) {
      try {
        await cloudinary.uploader.destroy(document.publicId);
        logger(`Document deleted from Cloudinary: ${document.publicId}`);
      } catch (deleteError) {
        logger(`Warning: Could not delete document from Cloudinary: ${deleteError.message}`);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Remove document from shared member's kycDocuments array
    sharedMember.kycDocuments.splice(documentIndex, 1);
    await sharedMember.save();

    res.status(200).json({
      status: 'success',
      body: {
        sharedMember: sharedMember
      },
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteKycDocument: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createSharedMember,
  getMySharedMembers,
  getAllSharedMembers,
  getSharedMemberById,
  updateSharedMember,
  deleteSharedMember,
  updateSharedMemberStatus,
  getSharedMemberStats,
  uploadKycDocument,
  updateKycDocument,
  deleteKycDocument
};

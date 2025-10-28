const User = require('../models/User');
const logger = require('../utils/logger');
const NotificationService = require('../utils/notificationService');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Upload KYC document to Cloudinary
const uploadKycDocument = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      // Delete the uploaded file if it's not PDF
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Only PDF files are allowed for KYC documents'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      // Delete the uploaded file if user not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    try {
      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'kyc-documents',
        resource_type: 'auto', // Automatically detect file type
        public_id: `kyc_${userId}_${Date.now()}`,
        format: 'pdf' // Ensure PDF format
      });

      // Delete temporary file after successful upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger(`KYC document uploaded successfully for user ${userId}: ${result.secure_url}`);

      res.status(200).json({
        status: 'success',
        body: {
          documentUrl: result.secure_url,
          publicId: result.public_id,
          originalName: req.file.originalname
        },
        message: 'Document uploaded successfully'
      });
    } catch (uploadError) {
      logger(`Error uploading to Cloudinary: ${uploadError.message}`);
      
      // Delete temporary file if upload failed
      if (req.file && fs.existsSync(req.file.path)) {
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

// Submit KYC documents
const submitKyc = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { kycDocs } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if KYC is already submitted or approved
    if (user.kycStatus === 'submitted' || user.kycStatus === 'approved') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'KYC already submitted or approved'
      });
    }

    // Update user's KYC status and documents
    user.kycStatus = 'submitted';
    user.kycDocs = kycDocs; // Array of document URLs or paths
    await user.save();

    res.status(200).json({
      status: 'success',
      body: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          kycStatus: user.kycStatus
        }
      },
      message: 'KYC documents submitted successfully'
    });
  } catch (error) {
    logger(`Error in submitKyc: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all KYC requests (for admin/superadmin)
const getAllKycRequests = async (req, res) => {
  try {
    const { status } = req.query; // Filter by status if provided (pending, submitted, approved, rejected)
    
    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    let filter = {};
    if (status) {
      filter.kycStatus = status;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      body: { users },
      message: 'KYC requests fetched successfully'
    });
  } catch (error) {
    logger(`Error in getAllKycRequests: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get specific user's KYC details (for admin/superadmin)
const getKycDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      body: { user },
      message: 'KYC details fetched successfully'
    });
  } catch (error) {
    logger(`Error in getKycDetails: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Approve KYC request (for admin/superadmin)
const approveKyc = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if KYC is in submitted status
    if (user.kycStatus !== 'submitted') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'KYC is not in submitted status'
      });
    }

    // Update user's KYC status
    user.kycStatus = 'approved';
    user.kycApprovedBy = {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
      email: req.user.email
    };
    await user.save();

    // Create notifications
    try {
      // User notification
      await NotificationService.createKYCApprovalNotification(user._id, user.name);
      
      // Admin notification
      await NotificationService.createUserKYCApprovalNotification(user);
    } catch (notificationError) {
      logger(`Error creating KYC approval notifications: ${notificationError.message}`);
    }

    res.status(200).json({
      status: 'success',
      body: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          kycStatus: user.kycStatus
        }
      },
      message: 'KYC request approved successfully'
    });
  } catch (error) {
    logger(`Error in approveKyc: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Reject KYC request (for admin/superadmin)
const rejectKyc = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;

    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if KYC is in submitted status
    if (user.kycStatus !== 'submitted') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'KYC is not in submitted status'
      });
    }

    // Add rejection comment
    user.rejected_comments.push({
      comment: rejectionReason,
      date: new Date()
    });

    // Update user's KYC status
    user.kycStatus = 'rejected';
    await user.save();

    // Create notifications
    try {
      // User notification
      await NotificationService.createKYCRejectionNotification(user._id, user.name, rejectionReason);
      
      // Admin notification
      await NotificationService.createUserKYCRejectionNotification(user, rejectionReason);
    } catch (notificationError) {
      logger(`Error creating KYC rejection notifications: ${notificationError.message}`);
    }

    res.status(200).json({
      status: 'success',
      body: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          kycStatus: user.kycStatus
        }
      },
      message: 'KYC request rejected successfully'
    });
  } catch (error) {
    logger(`Error in rejectKyc: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get user's own KYC status (for users)
const getMyKycStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const user = await User.findById(userId)
      .select('kycStatus kycDocs rejected_comments kycApprovedBy createdAt');

    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      body: {
        kycStatus: user.kycStatus,
        kycDocs: user.kycDocs,
        rejected_comments: user.rejected_comments,
        kycApprovedBy: user.kycApprovedBy,
        createdAt: user.createdAt
      },
      message: 'KYC status fetched successfully'
    });
  } catch (error) {
    logger(`Error in getMyKycStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  uploadKycDocument,
  submitKyc,
  getAllKycRequests,
  getKycDetails,
  approveKyc,
  rejectKyc,
  getMyKycStatus
};
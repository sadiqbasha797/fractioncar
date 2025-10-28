const User = require('../models/User');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { sendVerificationEmail } = require('../utils/emailService');
const UserStatusService = require('../utils/userStatusService');

// Local helper to generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }
    res.json({
      status: 'success',
      body: { user },
      message: 'Profile retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getProfile: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, dateofbirth, address, location, pincode, governmentid, email } = req.body;

    // Fetch current user first to compare and validate
    const currentUser = await User.findById(req.user.id).select('-password');
    if (!currentUser) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Build update object for allowed fields
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (dateofbirth) updateFields.dateofbirth = dateofbirth;
    if (address) updateFields.address = address;
    if (location) updateFields.location = location;
    if (pincode) updateFields.pincode = pincode;
    if (governmentid) updateFields.governmentid = governmentid;

    let emailChanged = false;
    let verificationCode = null;
    // Handle email change: enforce uniqueness, mark unverified, send code
    if (email && email !== currentUser.email) {
      const existing = await User.findOne({ email, _id: { $ne: currentUser._id } });
      if (existing) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Email is already in use by another account'
        });
      }

      emailChanged = true;
      verificationCode = generateVerificationCode();
      const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      updateFields.email = email;
      updateFields.verified = false; // require re-verification on email change
      updateFields.logintoken = verificationCode;
      updateFields.tokensExpiry = tokenExpiry;
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // If email changed, send verification email to new email address
    if (emailChanged && verificationCode) {
      try {
        await sendVerificationEmail(updatedUser, verificationCode);
      } catch (e) {
        logger(`Failed sending verification email after email change: ${e.message}`);
      }
    }

    res.json({
      status: 'success',
      body: { user: updatedUser, emailChangeVerificationSent: emailChanged },
      message: emailChanged ? 'Profile updated. Verification code sent to new email.' : 'Profile updated successfully'
    });
  } catch (error) {
    logger(`Error in updateProfile: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    // Update user with profile image URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileimage: result.secure_url },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      body: { user },
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    logger(`Error in uploadProfileImage: ${error.message}`);
    // Delete the temporary file if it exists
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

// Update government ID (text values)
const updateGovernmentId = async (req, res) => {
  try {
    const { idType, idValue } = req.body; // idType should be 'aadharid', 'panid', 'licenseid', or 'incomecertificateid'
    
    if (!idType || !idValue) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'ID type and value are required'
      });
    }
    
    if (!['aadharid', 'panid', 'licenseid', 'income'].includes(idType)) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid ID type'
      });
    }

    // Build update object for the specific ID type
    const updateFields = {};
    updateFields[`governmentid.${idType}`] = idValue;

    // Update user with government ID value
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      body: { user },
      message: `${idType} updated successfully`
    });
  } catch (error) {
    logger(`Error in updateGovernmentId: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Create user (for admin/superadmin)
const createUser = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { name, email, password, phone, dateofbirth, address, location, pincode } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Handle KYC file upload
    let kycDocs = [];
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path);
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        // Add KYC document URL to the array
        kycDocs.push(result.secure_url);
      } catch (uploadError) {
        logger(`Error uploading KYC document to Cloudinary: ${uploadError.message}`);
        // Delete the temporary file if it exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Failed to upload KYC document'
        });
      }
    }

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      dateofbirth,
      address,
      location,
      pincode,
      logintoken: verificationCode,
      tokensExpiry: tokenExpiry,
      verified: false,
      kycDocs: kycDocs,
      kycStatus: kycDocs.length > 0 ? 'submitted' : 'pending'
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationCode);
    } catch (emailError) {
      logger(`Failed to send verification email: ${emailError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          dateofbirth: user.dateofbirth,
          address: user.address,
          location: user.location,
          pincode: user.pincode,
          kycStatus: user.kycStatus,
          verified: user.verified
        }
      },
      message: 'User created successfully. Verification email sent.'
    });
  } catch (error) {
    logger(`Error in createUser: ${error.message}`);
    // Clean up uploaded file if it exists
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

// Update user by ID (for admin/superadmin)
const updateUserById = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;
    const { name, email, password, phone, dateofbirth, address, location, pincode } = req.body;

    // Find the user to update
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (dateofbirth) updateFields.dateofbirth = dateofbirth;
    if (address) updateFields.address = address;
    if (location) updateFields.location = location;
    if (pincode) updateFields.pincode = pincode;

    // Handle email change
    if (email && email !== userToUpdate.email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Email is already in use by another account'
        });
      }
      updateFields.email = email;
      updateFields.verified = false; // Require re-verification on email change
    }

    // Handle password change
    if (password) {
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      updateFields.password = await bcrypt.hash(password, saltRounds);
    }

    // Handle KYC file upload
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      const fs = require('fs');
      
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path);
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        // Add KYC document URL to the user's kycDocs array
        updateFields.$push = { kycDocs: result.secure_url };
        
        // Update KYC status to submitted if it was pending
        if (userToUpdate.kycStatus === 'pending') {
          updateFields.kycStatus = 'submitted';
        }
      } catch (uploadError) {
        logger(`Error uploading KYC document to Cloudinary: ${uploadError.message}`);
        // Delete the temporary file if it exists
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Failed to upload KYC document'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      body: { user: updatedUser },
      message: 'User updated successfully'
    });
  } catch (error) {
    logger(`Error in updateUserById: ${error.message}`);
    // Clean up uploaded file if it exists
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

// Delete user by ID (for admin/superadmin)
const deleteUserById = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;

    // Find the user to delete
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      status: 'success',
      body: {},
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteUserById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all users (for admin/superadmin)
const getAllUsers = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      body: { users },
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAllUsers: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Suspend user (admin/superadmin only)
const suspendUser = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Suspension reason is required'
      });
    }

    const changedBy = {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name || 'Admin',
      email: req.user.email || 'admin@fraction.com'
    };

    const user = await UserStatusService.suspendUser(userId, reason, changedBy);

    res.json({
      status: 'success',
      body: { 
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          suspensionEndDate: user.suspensionEndDate,
          suspensionReason: user.suspensionReason
        }
      },
      message: 'User suspended successfully for 7 days'
    });
  } catch (error) {
    logger(`Error in suspendUser: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: error.message || 'Internal server error'
    });
  }
};

// Deactivate user (admin/superadmin only)
const deactivateUser = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Deactivation reason is required'
      });
    }

    const changedBy = {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name || 'Admin',
      email: req.user.email || 'admin@fraction.com'
    };

    const user = await UserStatusService.deactivateUser(userId, reason, changedBy);

    res.json({
      status: 'success',
      body: { 
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          deactivationReason: user.deactivationReason
        }
      },
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger(`Error in deactivateUser: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: error.message || 'Internal server error'
    });
  }
};

// Reactivate user (admin/superadmin only)
const reactivateUser = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Reactivation reason is required'
      });
    }

    const changedBy = {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name || 'Admin',
      email: req.user.email || 'admin@fraction.com'
    };

    const user = await UserStatusService.reactivateUser(userId, reason, changedBy);

    res.json({
      status: 'success',
      body: { 
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status
        }
      },
      message: 'User reactivated successfully'
    });
  } catch (error) {
    logger(`Error in reactivateUser: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: error.message || 'Internal server error'
    });
  }
};

// Get users by status (admin/superadmin only)
const getUsersByStatus = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!['active', 'suspended', 'deactivated'].includes(status)) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid status. Must be active, suspended, or deactivated'
      });
    }

    const result = await UserStatusService.getUsersByStatus(status, parseInt(page), parseInt(limit));

    res.json({
      status: 'success',
      body: result,
      message: `${status} users retrieved successfully`
    });
  } catch (error) {
    logger(`Error in getUsersByStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get user status history (admin/superadmin only)
const getUserStatusHistory = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const { userId } = req.params;
    const history = await UserStatusService.getUserStatusHistory(userId);

    res.json({
      status: 'success',
      body: { history },
      message: 'User status history retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getUserStatusHistory: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: error.message || 'Internal server error'
    });
  }
};

// Get suspension statistics (admin/superadmin only)
const getSuspensionStats = async (req, res) => {
  try {
    // Check if user has admin or superadmin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or Superadmin role required.'
      });
    }

    const stats = await UserStatusService.getSuspensionStats();

    res.json({
      status: 'success',
      body: { stats },
      message: 'Suspension statistics retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSuspensionStats: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Check user action permissions
const checkUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = await UserStatusService.canUserPerformActions(userId);

    res.json({
      status: 'success',
      body: { permissions },
      message: 'User permissions checked successfully'
    });
  } catch (error) {
    logger(`Error in checkUserPermissions: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get email notification preferences
const getEmailNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('emailNotifications');
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Return default preferences if not set
    const preferences = user.emailNotifications || {
      enabled: true,
      tokenPurchase: true,
      bookNowToken: true,
      amcPayment: true,
      booking: true,
      kyc: true,
      refund: true,
      sharedMember: true
    };

    res.json({
      status: 'success',
      body: { emailNotifications: preferences },
      message: 'Email notification preferences retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getEmailNotificationPreferences: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update email notification preferences
const updateEmailNotificationPreferences = async (req, res) => {
  try {
    const { enabled, tokenPurchase, bookNowToken, amcPayment, booking, kyc, refund, sharedMember } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Initialize emailNotifications if it doesn't exist
    if (!user.emailNotifications) {
      user.emailNotifications = {};
    }

    // Update only provided fields
    if (typeof enabled === 'boolean') user.emailNotifications.enabled = enabled;
    if (typeof tokenPurchase === 'boolean') user.emailNotifications.tokenPurchase = tokenPurchase;
    if (typeof bookNowToken === 'boolean') user.emailNotifications.bookNowToken = bookNowToken;
    if (typeof amcPayment === 'boolean') user.emailNotifications.amcPayment = amcPayment;
    if (typeof booking === 'boolean') user.emailNotifications.booking = booking;
    if (typeof kyc === 'boolean') user.emailNotifications.kyc = kyc;
    if (typeof refund === 'boolean') user.emailNotifications.refund = refund;
    if (typeof sharedMember === 'boolean') user.emailNotifications.sharedMember = sharedMember;

    // Mark the nested object as modified so Mongoose saves it
    user.markModified('emailNotifications');
    
    await user.save();

    logger(`Email notification preferences updated for user ${user.email}`);

    res.json({
      status: 'success',
      body: { emailNotifications: user.emailNotifications },
      message: 'Email notification preferences updated successfully'
    });
  } catch (error) {
    logger(`Error in updateEmailNotificationPreferences: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  updateGovernmentId,
  createUser,
  updateUserById,
  deleteUserById,
  getAllUsers,
  suspendUser,
  deactivateUser,
  reactivateUser,
  getUsersByStatus,
  getUserStatusHistory,
  getSuspensionStats,
  checkUserPermissions,
  getEmailNotificationPreferences,
  updateEmailNotificationPreferences
};
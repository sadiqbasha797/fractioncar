const User = require('../models/User');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { sendVerificationEmail } = require('../utils/emailService');

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

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  updateGovernmentId,
  getAllUsers
};
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const logger = require('../utils/logger');
const { sendVerificationEmail, sendPasswordResetEmailWithCode } = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Helper function to generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, mobile, location, pincode, dateofbirth, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'User already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: mobile, // Map mobile to phone field
      location,
      pincode,
      dateofbirth,
      address,
      logintoken: verificationCode,
      tokensExpiry: tokenExpiry,
      verified: false
    });

    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(user, verificationCode);
    if (!emailResult.success) {
      logger(`Failed to send verification email to ${email}: ${emailResult.error}`);
    }

    res.status(201).json({
      status: 'success',
      body: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          pincode: user.pincode,
          dateofbirth: user.dateofbirth,
          address: user.address,
          verified: user.verified,
          kycStatus: user.kycStatus
        },
        emailSent: emailResult.success
      },
      message: 'User registered successfully. Please check your email for verification code.'
    });
  } catch (error) {
    logger(`Error in registerUser: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(400).json({
        status: 'failed',
        body: {
          userId: user._id,
          email: user.email,
          verified: false
        },
        message: 'Email not verified. Please verify your email first.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      body: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          dateofbirth: user.dateofbirth,
          address: user.address,
          verified: user.verified,
          kycStatus: user.kycStatus
        }
      },
      message: 'User logged in successfully'
    });
  } catch (error) {
    logger(`Error in loginUser: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Admin already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new admin with default permissions if none provided
    const defaultPermissions = ['dashboard', 'cars', 'bookings', 'tickets', 'users', 'tokens', 'contact-forms', 'notifications'];
    const adminPermissions = permissions && permissions.length > 0 ? permissions : defaultPermissions;
    
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      phone,
      permissions: adminPermissions
    });

    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      body: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions: admin.permissions
        }
      },
      message: 'Admin registered successfully'
    });
  } catch (error) {
    logger(`Error in registerAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      body: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions: admin.permissions
        }
      },
      message: 'Admin logged in successfully'
    });
  } catch (error) {
    logger(`Error in loginAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Register Super Admin
const registerSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, permissions } = req.body;

    // Check if super admin already exists
    const existingSuperAdmin = await SuperAdmin.findOne({ email });
    if (existingSuperAdmin) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Super Admin already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new super admin
    const superAdmin = new SuperAdmin({
      name,
      email,
      password: hashedPassword,
      phone,
    });

    await superAdmin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: superAdmin._id, email: superAdmin.email, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      body: {
        token,
        superAdmin: {
          id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          phone: superAdmin.phone,
          role: superAdmin.role,
          permissions: superAdmin.permissions
        }
      },
      message: 'Super Admin registered successfully'
    });
  } catch (error) {
    logger(`Error in registerSuperAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Login Super Admin
const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find super admin by email
    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: superAdmin._id, email: superAdmin.email, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      body: {
        token,
        superAdmin: {
          id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          phone: superAdmin.phone,
          role: superAdmin.role,
          permissions: superAdmin.permissions
        }
      },
      message: 'Super Admin logged in successfully'
    });
  } catch (error) {
    logger(`Error in loginSuperAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    let profile;

    if (user.role === 'user') {
      profile = await User.findById(user.id).select('-password');
    } else if (user.role === 'admin') {
      profile = await Admin.findById(user.id).select('-password');
    } else if (user.role === 'superadmin') {
      profile = await SuperAdmin.findById(user.id).select('-password');
    }

    if (!profile) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      body: { user: profile },
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

// Validate Token
const validateToken = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      body: {},
      message: 'Token is valid'
    });
  } catch (error) {
    logger(`Error in validateToken: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email and verification code are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email already verified'
      });
    }

    // Check if code matches and is not expired
    if (user.logintoken !== code) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid verification code'
      });
    }

    if (user.tokensExpiry && user.tokensExpiry < new Date()) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    // Update user as verified
    user.verified = true;
    user.logintoken = undefined;
    user.tokensExpiry = undefined;
    await user.save();

    // Create welcome notification
    try {
      await NotificationService.createWelcomeNotification(user._id, user.name);
    } catch (notificationError) {
      logger(`Error creating welcome notification: ${notificationError.message}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      body: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          verified: user.verified,
          kycStatus: user.kycStatus
        }
      },
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger(`Error in verifyEmail: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Resend Verification Code
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email already verified'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new code
    user.logintoken = verificationCode;
    user.tokensExpiry = tokenExpiry;
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(user, verificationCode);

    res.json({
      status: 'success',
      body: {
        emailSent: emailResult.success
      },
      message: emailResult.success 
        ? 'Verification code sent successfully'
        : 'Verification code generated but email failed to send'
    });
  } catch (error) {
    logger(`Error in resendVerificationCode: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        status: 'success',
        body: {},
        message: 'If the email exists, a password reset code has been sent'
      });
    }

    // Generate password reset code
    const resetCode = generateVerificationCode();
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset code
    user.passwordtoken = resetCode;
    user.tokensExpiry = tokenExpiry;
    await user.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmailWithCode(user, resetCode);

    res.json({
      status: 'success',
      body: {
        emailSent: emailResult.success
      },
      message: 'If the email exists, a password reset code has been sent'
    });
  } catch (error) {
    logger(`Error in requestPasswordReset: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email, reset code, and new password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }

    // Check if code matches and is not expired
    if (user.passwordtoken !== code) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid reset code'
      });
    }

    if (user.tokensExpiry && user.tokensExpiry < new Date()) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Reset code has expired. Please request a new one.'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordtoken = undefined;
    user.tokensExpiry = undefined;
    await user.save();

    res.json({
      status: 'success',
      body: {},
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger(`Error in resetPassword: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerAdmin,
  loginAdmin,
  registerSuperAdmin,
  loginSuperAdmin,
  getProfile,
  validateToken,
  verifyEmail,
  resendVerificationCode,
  requestPasswordReset,
  resetPassword
};
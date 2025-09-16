const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all admins (superadmin only)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password');
    
    res.json({
      status: 'success',
      body: { admins },
      message: 'Admins retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAllAdmins: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get admin by ID (superadmin only)
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Admin not found'
      });
    }
    
    res.json({
      status: 'success',
      body: { admin },
      message: 'Admin retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAdminById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Create new admin (superadmin only)
const createAdmin = async (req, res) => {
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

    // Create new admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      phone,
      permissions: permissions || []
    });

    await admin.save();

    res.status(201).json({
      status: 'success',
      body: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions: admin.permissions,
          createdAt: admin.createdAt
        }
      },
      message: 'Admin created successfully'
    });
  } catch (error) {
    logger(`Error in createAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update admin (superadmin only)
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, permissions, password } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Admin not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Email already exists'
        });
      }
    }

    // Update admin fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone !== undefined) admin.phone = phone;
    if (permissions) admin.permissions = permissions;
    
    // Update password if provided
    if (password && password.trim()) {
      const saltRounds = 10;
      admin.password = await bcrypt.hash(password, saltRounds);
    }

    await admin.save();

    res.json({
      status: 'success',
      body: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions: admin.permissions,
          createdAt: admin.createdAt
        }
      },
      message: 'Admin updated successfully'
    });
  } catch (error) {
    logger(`Error in updateAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete admin (superadmin only)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Admin not found'
      });
    }

    await Admin.findByIdAndDelete(id);

    res.json({
      status: 'success',
      body: {},
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteAdmin: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update admin password (superadmin only)
const updateAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Admin not found'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    admin.password = hashedPassword;

    await admin.save();

    res.json({
      status: 'success',
      body: {},
      message: 'Admin password updated successfully'
    });
  } catch (error) {
    logger(`Error in updateAdminPassword: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminPassword
};

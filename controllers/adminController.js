const Admin = require('../models/Admin');
const Car = require('../models/Car');
const AMC = require('../models/amc');
const Ticket = require('../models/Ticket');
const Contract = require('../models/contract');
const SharedMember = require('../models/SharedMember');
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

// Get admin activities (superadmin only)
const getAdminActivities = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 10, type = 'all' } = req.query;
    
    const skip = (page - 1) * limit;
    const activities = [];
    
    // Get admin info
    const admin = await Admin.findById(adminId).select('name email');
    if (!admin) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Admin not found'
      });
    }
    
    // Get cars created by admin
    if (type === 'all' || type === 'cars') {
      const cars = await Car.find({ 
        createdBy: adminId,
        createdByModel: 'Admin'
      })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(type === 'cars' ? skip : 0)
      .limit(type === 'cars' ? limit : 100);
      
      cars.forEach(car => {
        activities.push({
          type: 'car',
          id: car._id,
          title: car.carname || 'Unnamed Car',
          description: `${car.brandname} - ₹${car.price}`,
          createdAt: car.createdAt,
          status: car.status,
          admin: admin
        });
      });
    }
    
    // Get tickets created by admin
    if (type === 'all' || type === 'tickets') {
      const tickets = await Ticket.find({ 
        createdby: adminId,
        createdByModel: 'Admin'
      })
      .populate('createdby', 'name email')
      .populate('carid', 'carname brandname')
      .populate('userid', 'name email')
      .sort({ createdate: -1 })
      .skip(type === 'tickets' ? skip : 0)
      .limit(type === 'tickets' ? limit : 100);
      
      tickets.forEach(ticket => {
        activities.push({
          type: 'ticket',
          id: ticket._id,
          title: `Ticket ${ticket.ticketcustomid}`,
          description: `${ticket.carid?.carname || 'Unknown Car'} - ₹${ticket.ticketprice}`,
          createdAt: ticket.createdate,
          status: ticket.ticketstatus,
          admin: admin
        });
      });
    }
    
    // Get contracts created by admin
    if (type === 'all' || type === 'contracts') {
      const contracts = await Contract.find({ 
        createdby: adminId,
        createdByModel: 'Admin'
      })
      .populate('createdby', 'name email')
      .populate('carid', 'carname brandname')
      .populate('userid', 'name email')
      .sort({ createdat: -1 })
      .skip(type === 'contracts' ? skip : 0)
      .limit(type === 'contracts' ? limit : 100);
      
      contracts.forEach(contract => {
        activities.push({
          type: 'contract',
          id: contract._id,
          title: `Contract for ${contract.carid?.carname || 'Unknown Car'}`,
          description: `User: ${contract.userid?.name || 'Unknown User'}`,
          createdAt: contract.createdat,
          status: 'active',
          admin: admin
        });
      });
    }
    
    // Get shared members created by admin
    if (type === 'all' || type === 'shared-members') {
      const sharedMembers = await SharedMember.find({ 
        createdBy: adminId,
        createdByModel: 'Admin'
      })
      .populate('createdBy', 'name email')
      .populate('ticketid', 'ticketcustomid')
      .populate('userid', 'name email')
      .sort({ created_at: -1 })
      .skip(type === 'shared-members' ? skip : 0)
      .limit(type === 'shared-members' ? limit : 100);
      
      sharedMembers.forEach(member => {
        activities.push({
          type: 'shared-member',
          id: member._id,
          title: `Shared Member: ${member.name}`,
          description: `${member.email} - ${member.status}`,
          createdAt: member.created_at,
          status: member.status,
          admin: admin
        });
      });
    }
    
    // Note: AMCs are system-generated and not created by admins, so we exclude them from admin activity tracking
    // If you want to show AMCs related to tickets created by this admin, we would need to filter by ticket.createdby
    // For now, we'll skip AMCs entirely from admin activities
    
    // Sort all activities by creation date
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination for 'all' type
    let paginatedActivities = activities;
    if (type === 'all') {
      paginatedActivities = activities.slice(skip, skip + parseInt(limit));
    }
    
    // Get counts for each type (excluding AMCs as they are system-generated)
    const counts = {
      cars: await Car.countDocuments({ createdBy: adminId, createdByModel: 'Admin' }),
      tickets: await Ticket.countDocuments({ createdby: adminId, createdByModel: 'Admin' }),
      contracts: await Contract.countDocuments({ createdby: adminId, createdByModel: 'Admin' }),
      sharedMembers: await SharedMember.countDocuments({ createdBy: adminId, createdByModel: 'Admin' }),
      amcs: 0 // AMCs are system-generated, not admin-created
    };
    
    res.json({
      status: 'success',
      body: {
        activities: paginatedActivities,
        admin: admin,
        counts: counts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(activities.length / parseInt(limit)),
          totalItems: activities.length,
          itemsPerPage: parseInt(limit)
        }
      },
      message: 'Admin activities retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAdminActivities: ${error.message}`);
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
  updateAdminPassword,
  getAdminActivities
};

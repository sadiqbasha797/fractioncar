const BlockedDate = require('../models/BlockedDate');
const Car = require('../models/Car');
const logger = require('../utils/logger');

// Create a new blocked date (Admin/SuperAdmin only)
const createBlockedDate = async (req, res) => {
  try {
    const { carid, blockedFrom, blockedTo, reason } = req.body;

    // Validate required fields
    if (!carid || !blockedFrom || !blockedTo) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Car ID, blocked from date, and blocked to date are required'
      });
    }

    // Validate dates
    const fromDate = new Date(blockedFrom);
    const toDate = new Date(blockedTo);
    
    if (fromDate >= toDate) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Blocked from date must be before blocked to date'
      });
    }

    // Check if car exists
    const car = await Car.findById(carid);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Check for overlapping blocked dates
    const overlappingBlockedDates = await BlockedDate.find({
      carid: carid,
      isActive: true,
      $or: [
        {
          blockedFrom: { $lte: toDate },
          blockedTo: { $gte: fromDate }
        }
      ]
    });

    if (overlappingBlockedDates.length > 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Date range overlaps with existing blocked dates'
      });
    }

    const blockedDate = new BlockedDate({
      carid,
      blockedFrom: fromDate,
      blockedTo: toDate,
      reason: reason || 'Maintenance',
      createdBy: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    });

    await blockedDate.save();

    const populatedBlockedDate = await BlockedDate.findById(blockedDate._id)
      .populate('carid', 'carname brandname')
      .populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      body: { blockedDate: populatedBlockedDate },
      message: 'Blocked date created successfully'
    });
  } catch (error) {
    logger(`Error in createBlockedDate: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all blocked dates (Admin/SuperAdmin only)
const getBlockedDates = async (req, res) => {
  try {
    const { carid } = req.query;
    
    let filter = { isActive: true };
    
    // Filter by car if specified
    if (carid) {
      filter.carid = carid;
    }
    
    const blockedDates = await BlockedDate.find(filter)
      .populate('carid', 'carname brandname')
      .populate('createdBy', 'name email')
      .sort({ blockedFrom: 1 });
      
    res.json({
      status: 'success',
      body: { blockedDates },
      message: 'Blocked dates retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBlockedDates: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get blocked dates for a specific car (Public API for availability checking)
const getCarBlockedDates = async (req, res) => {
  try {
    const { carId } = req.params;
    
    const blockedDates = await BlockedDate.find({
      carid: carId,
      isActive: true
    }).sort({ blockedFrom: 1 });
    
    res.json({
      status: 'success',
      body: { blockedDates },
      message: 'Car blocked dates retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getCarBlockedDates: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a blocked date (Admin/SuperAdmin only)
const updateBlockedDate = async (req, res) => {
  try {
    const { blockedFrom, blockedTo, reason } = req.body;
    
    const blockedDate = await BlockedDate.findById(req.params.id);
    if (!blockedDate) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Blocked date not found'
      });
    }
    
    // Validate dates if provided
    if (blockedFrom && blockedTo) {
      const fromDate = new Date(blockedFrom);
      const toDate = new Date(blockedTo);
      
      if (fromDate >= toDate) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Blocked from date must be before blocked to date'
        });
      }

      // Check for overlapping blocked dates (excluding current one)
      const overlappingBlockedDates = await BlockedDate.find({
        _id: { $ne: req.params.id },
        carid: blockedDate.carid,
        isActive: true,
        $or: [
          {
            blockedFrom: { $lte: toDate },
            blockedTo: { $gte: fromDate }
          }
        ]
      });

      if (overlappingBlockedDates.length > 0) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Date range overlaps with existing blocked dates'
        });
      }
    }
    
    // Update fields
    if (blockedFrom) blockedDate.blockedFrom = new Date(blockedFrom);
    if (blockedTo) blockedDate.blockedTo = new Date(blockedTo);
    if (reason !== undefined) blockedDate.reason = reason;
    
    await blockedDate.save();
    
    const updatedBlockedDate = await BlockedDate.findById(req.params.id)
      .populate('carid', 'carname brandname')
      .populate('createdBy', 'name email');
    
    res.json({
      status: 'success',
      body: { blockedDate: updatedBlockedDate },
      message: 'Blocked date updated successfully'
    });
  } catch (error) {
    logger(`Error in updateBlockedDate: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a blocked date (Admin/SuperAdmin only)
const deleteBlockedDate = async (req, res) => {
  try {
    const blockedDate = await BlockedDate.findById(req.params.id);
    if (!blockedDate) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Blocked date not found'
      });
    }
    
    // Soft delete by setting isActive to false
    blockedDate.isActive = false;
    await blockedDate.save();
    
    res.json({
      status: 'success',
      body: {},
      message: 'Blocked date deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteBlockedDate: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Check if dates are blocked for a specific car
const checkDateAvailability = async (req, res) => {
  try {
    const { carId, bookingFrom, bookingTo } = req.body;
    
    // Check for overlapping blocked dates
    const overlappingBlockedDates = await BlockedDate.find({
      carid: carId,
      isActive: true,
      $or: [
        {
          blockedFrom: { $lte: new Date(bookingTo) },
          blockedTo: { $gte: new Date(bookingFrom) }
        }
      ]
    });
    
    const isAvailable = overlappingBlockedDates.length === 0;
    
    res.json({
      status: 'success',
      body: { 
        isAvailable,
        conflictingBlockedDates: overlappingBlockedDates
      },
      message: isAvailable ? 'Date range is available' : 'Date range conflicts with blocked dates'
    });
  } catch (error) {
    logger(`Error in checkDateAvailability: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createBlockedDate,
  getBlockedDates,
  getCarBlockedDates,
  updateBlockedDate,
  deleteBlockedDate,
  checkDateAvailability
};

const AMC = require('../models/amc');
const User = require('../models/User');
const Car = require('../models/Car');
const logger = require('../utils/logger');
const { 
  sendAMCPaymentConfirmationEmail, 
  sendSuperAdminAMCPaymentNotification 
} = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');
const AMCPenaltyService = require('../utils/amcPenaltyService');

// Create a new AMC
const createAMC = async (req, res) => {
  try {
    const { userid, carid, ticketid, amcamount } = req.body;

    const amc = new AMC({
      userid,
      carid,
      ticketid,
      amcamount
    });

    await amc.save();

    // Send emails and create notifications after successful AMC creation
    try {
      // Get user and car details for email
      const user = await User.findById(userid);
      const car = await Car.findById(carid);
      
      if (user && car) {
        // Send confirmation email to user
        await sendAMCPaymentConfirmationEmail(user, amc, car);
        
        // Send notification email to superadmin
        await sendSuperAdminAMCPaymentNotification(user, amc, car);
        
        // Create notifications
        await NotificationService.createAMCPaymentNotification(user._id, amc, car);
        await NotificationService.createUserPaidAMCNotification(user, amc, car);
        
        logger(`Emails and notifications sent successfully for AMC creation: ${amc._id}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the AMC creation
      logger(`Error sending emails/notifications for AMC creation: ${emailError.message}`);
    }

    res.status(201).json({
      status: 'success',
      body: { amc },
      message: 'AMC created successfully'
    });
  } catch (error) {
    logger(`Error in createAMC: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all AMC records
const getAMCs = async (req, res) => {
  try {
    // If user is not admin/superadmin, only show their own AMC records
    const filter = (req.user.role === 'user') ? { userid: req.user.id } : {};
    
    const amcs = await AMC.find(filter).populate('userid carid ticketid');
    res.json({
      status: 'success',
      body: { amcs },
      message: 'AMCs retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAMCs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get an AMC by ID
const getAMCById = async (req, res) => {
  try {
    const amc = await AMC.findById(req.params.id).populate('userid carid ticketid');
    if (!amc) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'AMC not found'
      });
    }

    // If user is not admin/superadmin, check if they own this AMC
    if (req.user.role === 'user' && amc.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this AMC'
      });
    }

    res.json({
      status: 'success',
      body: { amc },
      message: 'AMC retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAMCById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update an AMC by ID
const updateAMC = async (req, res) => {
  try {
    const { amcamount } = req.body;

    const amc = await AMC.findById(req.params.id);
    if (!amc) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'AMC not found'
      });
    }

    // If user is not admin/superadmin, check if they own this AMC
    if (req.user.role === 'user' && amc.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this AMC'
      });
    }

    const updatedAMC = await AMC.findByIdAndUpdate(
      req.params.id,
      { amcamount },
      { new: true }
    ).populate('userid carid ticketid');

    res.json({
      status: 'success',
      body: { amc: updatedAMC },
      message: 'AMC updated successfully'
    });
  } catch (error) {
    logger(`Error in updateAMC: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete an AMC by ID
const deleteAMC = async (req, res) => {
  try {
    const amc = await AMC.findById(req.params.id);
    if (!amc) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'AMC not found'
      });
    }

    // If user is not admin/superadmin, check if they own this AMC
    if (req.user.role === 'user' && amc.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this AMC'
      });
    }

    await AMC.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'AMC deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteAMC: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update AMC payment status
const updateAMCPaymentStatus = async (req, res) => {
  try {
    const { yearIndex, paid, paiddate } = req.body;

    const amc = await AMC.findById(req.params.id);
    if (!amc) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'AMC not found'
      });
    }

    // If user is not admin/superadmin, check if they own this AMC
    if (req.user.role === 'user' && amc.userid.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this AMC'
      });
    }

    // Update the specific year's payment status
    if (amc.amcamount[yearIndex]) {
      amc.amcamount[yearIndex].paid = paid;
      if (paiddate) {
        amc.amcamount[yearIndex].paiddate = paiddate;
      }
      await amc.save();
      
      const updatedAMC = await AMC.findById(req.params.id).populate('userid carid ticketid');
      
      // Send emails and create notifications if payment is marked as paid
      if (paid) {
        try {
          const user = updatedAMC.userid;
          const car = updatedAMC.carid;
          
          if (user && car) {
            // Send confirmation email to user
            await sendAMCPaymentConfirmationEmail(user, updatedAMC, car);
            
            // Send notification email to superadmin
            await sendSuperAdminAMCPaymentNotification(user, updatedAMC, car);
            
            // Create notifications
            await NotificationService.createAMCPaymentNotification(user._id, updatedAMC, car);
            await NotificationService.createUserPaidAMCNotification(user, updatedAMC, car);
            
            logger(`Emails and notifications sent successfully for AMC payment: ${updatedAMC._id}`);
          }
        } catch (emailError) {
          // Log email error but don't fail the payment update
          logger(`Error sending emails/notifications for AMC payment: ${emailError.message}`);
        }
      }
      
      res.json({
        status: 'success',
        body: { amc: updatedAMC },
        message: 'AMC payment status updated successfully'
      });
    } else {
      res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid year index'
      });
    }
  } catch (error) {
    logger(`Error in updateAMCPaymentStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get overdue AMC records with penalty information
const getOverdueAMCs = async (req, res) => {
  try {
    // Only admin and superadmin can access this
    if (req.user.role === 'user') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access overdue AMC records'
      });
    }

    const overdueRecords = await AMCPenaltyService.getOverdueAMCRecords();
    
    res.json({
      status: 'success',
      body: { overdueRecords },
      message: 'Overdue AMC records retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getOverdueAMCs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Manually apply penalties for overdue AMC payments
const applyPenalties = async (req, res) => {
  try {
    // Only admin and superadmin can trigger this
    if (req.user.role === 'user') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to apply penalties'
      });
    }

    const result = await AMCPenaltyService.checkAndApplyPenalties();
    
    res.json({
      status: 'success',
      body: { 
        penaltiesApplied: result.penaltiesApplied,
        totalPenaltyAmount: result.totalPenaltyAmount,
        totalChecked: result.totalChecked
      },
      message: `Penalties applied successfully. ${result.penaltiesApplied} penalties applied with total amount ₹${result.totalPenaltyAmount}`
    });
  } catch (error) {
    logger(`Error in applyPenalties: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Apply penalty for a specific AMC
const applyPenaltyForAMC = async (req, res) => {
  try {
    // Only admin and superadmin can trigger this
    if (req.user.role === 'user') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to apply penalties'
      });
    }

    const { amcId } = req.params;
    const result = await AMCPenaltyService.applyPenaltyForAMC(amcId);
    
    res.json({
      status: 'success',
      body: { 
        penaltiesApplied: result.penaltiesApplied,
        totalPenaltyAmount: result.totalPenaltyAmount
      },
      message: `Penalties applied for AMC ${amcId}. ${result.penaltiesApplied} penalties applied with total amount ₹${result.totalPenaltyAmount}`
    });
  } catch (error) {
    logger(`Error in applyPenaltyForAMC: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createAMC,
  getAMCs,
  getAMCById,
  updateAMC,
  deleteAMC,
  updateAMCPaymentStatus,
  getOverdueAMCs,
  applyPenalties,
  applyPenaltyForAMC
};
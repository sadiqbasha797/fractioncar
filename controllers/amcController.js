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

// Generate AMC automatically for all active tickets
const generateAutomaticAMC = async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const results = {
      success: [],
      errors: [],
      skipped: []
    };

    // Get all active tickets with populated user and car data
    const tickets = await Ticket.find({ ticketstatus: 'active' })
      .populate('userid carid');

    for (const ticket of tickets) {
      try {
        // Check if user and car data is populated
        if (!ticket.userid || !ticket.carid) {
          results.skipped.push({
            ticketId: ticket._id,
            reason: 'Missing user or car data'
          });
          continue;
        }

        // Check if car has AMC per ticket defined
        if (!ticket.carid.amcperticket || ticket.carid.amcperticket === '0') {
          results.skipped.push({
            ticketId: ticket._id,
            carName: `${ticket.carid.brandname} ${ticket.carid.carname}`,
            reason: 'No AMC amount defined for this car'
          });
          continue;
        }

        // Check if AMC already exists for this ticket
        const existingAMC = await AMC.findOne({ ticketid: ticket._id });
        if (existingAMC) {
          results.skipped.push({
            ticketId: ticket._id,
            carName: `${ticket.carid.brandname} ${ticket.carid.carname}`,
            reason: 'AMC already exists for this ticket'
          });
          continue;
        }

        // Calculate AMC amount
        const amcAmount = parseFloat(ticket.carid.amcperticket);
        const currentYear = new Date().getFullYear();
        
        // Create AMC with due date 30 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const amcData = {
          userid: ticket.userid._id,
          carid: ticket.carid._id,
          ticketid: ticket._id,
          amcamount: [{
            year: currentYear,
            amount: amcAmount,
            paid: false,
            duedate: dueDate,
            penality: 0,
            lastPenaltyCalculation: new Date()
          }]
        };

        const amc = new AMC(amcData);
        await amc.save();

        results.success.push({
          ticketId: ticket._id,
          ticketCustomId: ticket.ticketcustomid,
          userName: ticket.userid.name,
          carName: `${ticket.carid.brandname} ${ticket.carid.carname}`,
          amcAmount: amcAmount,
          dueDate: dueDate,
          amcId: amc._id
        });

        logger(`Auto-generated AMC for ticket ${ticket.ticketcustomid}: ${amc._id}`);

      } catch (ticketError) {
        results.errors.push({
          ticketId: ticket._id,
          error: ticketError.message
        });
      }
    }

    res.json({
      status: 'success',
      body: {
        message: 'Automatic AMC generation completed',
        summary: {
          totalTickets: tickets.length,
          successCount: results.success.length,
          errorCount: results.errors.length,
          skippedCount: results.skipped.length
        },
        results
      }
    });

  } catch (error) {
    logger(`Error in generateAutomaticAMC: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Calculate penalties for overdue AMC payments
const calculatePenalties = async (req, res) => {
  try {
    const results = {
      updated: [],
      errors: []
    };

    // Find all AMC records with unpaid amounts
    const amcs = await AMC.find({
      'amcamount.paid': false,
      'amcamount.duedate': { $lt: new Date() }
    }).populate('userid carid ticketid');

    for (const amc of amcs) {
      try {
        let updated = false;
        
        for (let i = 0; i < amc.amcamount.length; i++) {
          const amount = amc.amcamount[i];
          
          if (!amount.paid && amount.duedate && amount.duedate < new Date()) {
            // Calculate days overdue
            const daysOverdue = Math.floor((new Date() - amount.duedate) / (1000 * 60 * 60 * 24));
            
            if (daysOverdue > 0) {
              // Calculate penalty: 18% per year, so daily penalty = (18% / 365) * amount
              const dailyPenaltyRate = 0.18 / 365;
              const penaltyAmount = amount.amount * dailyPenaltyRate * daysOverdue;
              
              // Update penalty
              amc.amcamount[i].penality = Math.round(penaltyAmount * 100) / 100; // Round to 2 decimal places
              amc.amcamount[i].lastPenaltyCalculation = new Date();
              updated = true;
            }
          }
        }
        
        if (updated) {
          await amc.save();
          results.updated.push({
            amcId: amc._id,
            ticketCustomId: amc.ticketid?.ticketcustomid,
            userName: amc.userid?.name,
            carName: amc.carid ? `${amc.carid.brandname} ${amc.carid.carname}` : 'Unknown Car',
            penalties: amc.amcamount.map(a => ({
              year: a.year,
              amount: a.amount,
              penalty: a.penality,
              daysOverdue: a.duedate ? Math.floor((new Date() - a.duedate) / (1000 * 60 * 60 * 24)) : 0
            }))
          });
        }

      } catch (amcError) {
        results.errors.push({
          amcId: amc._id,
          error: amcError.message
        });
      }
    }

    res.json({
      status: 'success',
      body: {
        message: 'Penalty calculation completed',
        summary: {
          totalAMCs: amcs.length,
          updatedCount: results.updated.length,
          errorCount: results.errors.length
        },
        results
      }
    });

  } catch (error) {
    logger(`Error in calculatePenalties: ${error.message}`);
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
  applyPenaltyForAMC,
  generateAutomaticAMC,
  calculatePenalties
};
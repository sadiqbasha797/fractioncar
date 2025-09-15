const AMCReminderService = require('../utils/amcReminderService');
const logger = require('../utils/logger');

// Manually trigger AMC reminder check (for testing)
const triggerAMCReminderCheck = async (req, res) => {
  try {
    // Only admin and superadmin can trigger this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const result = await AMCReminderService.checkAndSendReminders();
    
    res.json({
      status: 'success',
      body: result,
      message: 'AMC reminder check completed successfully'
    });
  } catch (error) {
    logger(`Error in triggerAMCReminderCheck: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get AMC records that need reminders
const getAMCRecordsNeedingReminders = async (req, res) => {
  try {
    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const records = await AMCReminderService.getAMCRecordsNeedingReminders();
    
    res.json({
      status: 'success',
      body: { records },
      message: 'AMC records needing reminders retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAMCRecordsNeedingReminders: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Send reminder for a specific AMC record
const sendReminderForAMC = async (req, res) => {
  try {
    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const { amcId } = req.params;
    const result = await AMCReminderService.sendReminderForAMC(amcId);
    
    res.json({
      status: 'success',
      body: result,
      message: 'AMC reminder sent successfully'
    });
  } catch (error) {
    logger(`Error in sendReminderForAMC: ${error.message}`);
    if (error.message === 'AMC record not found or missing user/car data') {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'AMC record not found or missing user/car data'
      });
    }
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  triggerAMCReminderCheck,
  getAMCRecordsNeedingReminders,
  sendReminderForAMC
};

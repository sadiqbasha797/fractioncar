const KYCReminderService = require('../utils/kycReminderService');
const logger = require('../utils/logger');

// Manually trigger KYC reminder check (for testing)
const triggerKYCReminderCheck = async (req, res) => {
  try {
    // Only admin and superadmin can trigger this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const result = await KYCReminderService.checkAndSendReminders();
    
    res.json({
      status: 'success',
      body: result,
      message: 'KYC reminder check completed successfully'
    });
  } catch (error) {
    logger(`Error in triggerKYCReminderCheck: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get users that need KYC reminders
const getUsersNeedingKYCReminders = async (req, res) => {
  try {
    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const users = await KYCReminderService.getUsersNeedingKYCReminders();
    
    res.json({
      status: 'success',
      body: { users },
      message: 'Users needing KYC reminders retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getUsersNeedingKYCReminders: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Send reminder for a specific user
const sendReminderForUser = async (req, res) => {
  try {
    // Only admin and superadmin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const { userId } = req.params;
    const result = await KYCReminderService.sendReminderForUser(userId);
    
    res.json({
      status: 'success',
      body: result,
      message: 'KYC reminder sent successfully'
    });
  } catch (error) {
    logger(`Error in sendReminderForUser: ${error.message}`);
    if (error.message === 'User not found') {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'User not found'
      });
    }
    if (error.message === 'User KYC is not in pending status') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'User KYC is not in pending status'
      });
    }
    if (error.message === 'User account is not active') {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'User account is not active'
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
  triggerKYCReminderCheck,
  getUsersNeedingKYCReminders,
  sendReminderForUser
};

const express = require('express');
const router = express.Router();
const {
  triggerKYCReminderCheck,
  getUsersNeedingKYCReminders,
  sendReminderForUser
} = require('../controllers/kycReminderController');
const authMiddleware = require('../middleware/authMiddleware');

// Manually trigger KYC reminder check
router.post('/trigger-check', authMiddleware(['admin', 'superadmin']), triggerKYCReminderCheck);

// Get users that need KYC reminders
router.get('/users-needing-reminders', authMiddleware(['admin', 'superadmin']), getUsersNeedingKYCReminders);

// Send reminder for a specific user
router.post('/send-reminder/:userId', authMiddleware(['admin', 'superadmin']), sendReminderForUser);

module.exports = router;

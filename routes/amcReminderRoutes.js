const express = require('express');
const router = express.Router();
const {
  triggerAMCReminderCheck,
  getAMCRecordsNeedingReminders,
  sendReminderForAMC
} = require('../controllers/amcReminderController');
const authMiddleware = require('../middleware/authMiddleware');

// Manually trigger AMC reminder check
router.post('/trigger-check', authMiddleware(['admin', 'superadmin']), triggerAMCReminderCheck);

// Get AMC records that need reminders
router.get('/records-needing-reminders', authMiddleware(['admin', 'superadmin']), getAMCRecordsNeedingReminders);

// Send reminder for a specific AMC record
router.post('/send-reminder/:amcId', authMiddleware(['admin', 'superadmin']), sendReminderForAMC);

module.exports = router;

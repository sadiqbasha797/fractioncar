const express = require('express');
const router = express.Router();
const { testEmailConfig } = require('../config/mail');
const { sendTestEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

// Test email configuration
router.get('/test-config', async (req, res) => {
  try {
    const isValid = await testEmailConfig();
    
    res.json({
      status: isValid ? 'success' : 'failed',
      body: { 
        configValid: isValid,
        message: isValid ? 'Email configuration is valid' : 'Email configuration has issues'
      },
      message: isValid ? 'Email config test passed' : 'Email config test failed'
    });
  } catch (error) {
    logger(`Error testing email config: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Error testing email configuration'
    });
  }
});

// Send test email
router.post('/send-test', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Email address is required'
      });
    }
    
    const result = await sendTestEmail(email);
    
    if (result.success) {
      res.json({
        status: 'success',
        body: { 
          messageId: result.messageId,
          sentTo: email
        },
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        status: 'failed',
        body: { error: result.error },
        message: 'Failed to send test email'
      });
    }
  } catch (error) {
    logger(`Error sending test email: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Error sending test email'
    });
  }
});

module.exports = router;

const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');

// KYC Reminder Scheduler Configuration
const KYC_REMINDER_CONFIG = {
  // Run KYC reminder check daily at 11:00 AM
  reminderCheckCron: '0 11 * * *', // Daily at 11 AM
  
  // API endpoints
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  
  // Admin credentials for API calls (should be stored securely in production)
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
};

class KYCReminderScheduler {
  constructor() {
    this.authToken = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Authenticate and get token
      await this.authenticate();
      this.isInitialized = true;
      logger('KYC Reminder Scheduler initialized successfully');
    } catch (error) {
      logger(`Failed to initialize KYC Reminder Scheduler: ${error.message}`);
      throw error;
    }
  }

  async authenticate() {
    try {
      const response = await axios.post(`${KYC_REMINDER_CONFIG.apiBaseUrl}/auth/login`, {
        email: KYC_REMINDER_CONFIG.adminCredentials.email,
        password: KYC_REMINDER_CONFIG.adminCredentials.password
      });

      if (response.data.status === 'success' && response.data.body.token) {
        this.authToken = response.data.body.token;
        logger('KYC Reminder Scheduler authenticated successfully');
      } else {
        throw new Error('Authentication failed: Invalid response');
      }
    } catch (error) {
      logger(`Authentication failed: ${error.message}`);
      throw error;
    }
  }

  async sendKYCReminders() {
    try {
      logger('Starting KYC reminder check...');
      
      const response = await axios.post(
        `${KYC_REMINDER_CONFIG.apiBaseUrl}/kyc-reminders/trigger-check`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        const result = response.data.body;
        logger(`KYC reminder check completed: ${result.remindersSent} reminders sent to ${result.totalChecked} users`);
      } else {
        throw new Error(`KYC reminder check failed: ${response.data.message}`);
      }
    } catch (error) {
      logger(`Error during KYC reminder check: ${error.message}`);
      
      // Try to re-authenticate if token expired
      if (error.response?.status === 401) {
        logger('Token expired, re-authenticating...');
        await this.authenticate();
        // Retry once
        return this.sendKYCReminders();
      }
    }
  }

  startScheduler() {
    if (!this.isInitialized) {
      logger('Scheduler not initialized. Call initialize() first.');
      return;
    }

    // Schedule KYC reminder check daily
    cron.schedule(KYC_REMINDER_CONFIG.reminderCheckCron, async () => {
      logger('Running scheduled KYC reminder check...');
      await this.sendKYCReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    logger('KYC Reminder Scheduler started successfully');
    logger(`KYC reminder check scheduled: ${KYC_REMINDER_CONFIG.reminderCheckCron}`);
  }

  stopScheduler() {
    cron.destroy();
    logger('KYC Reminder Scheduler stopped');
  }
}

// Export for use in main application
module.exports = KYCReminderScheduler;

// If running as standalone script
if (require.main === module) {
  const scheduler = new KYCReminderScheduler();
  
  // Initialize and start scheduler
  scheduler.initialize()
    .then(() => {
      scheduler.startScheduler();
      
      // Keep the process alive
      process.on('SIGINT', () => {
        logger('Received SIGINT, stopping scheduler...');
        scheduler.stopScheduler();
        process.exit(0);
      });
      
      logger('KYC Reminder Scheduler is running. Press Ctrl+C to stop.');
    })
    .catch((error) => {
      logger(`Failed to start KYC Reminder Scheduler: ${error.message}`);
      process.exit(1);
    });
}

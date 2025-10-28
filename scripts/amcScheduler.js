const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');

// AMC Scheduler Configuration
const AMC_SCHEDULER_CONFIG = {
  // Run AMC generation every 11 months (on the 1st day at 9:00 AM)
  amcGenerationCron: '0 9 1 */11 *', // Every 11 months on 1st day at 9 AM
  
  // Run penalty calculation daily at 10:00 AM
  penaltyCalculationCron: '0 10 * * *', // Daily at 10 AM
  
  // API endpoints
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  
  // Admin credentials for API calls (should be stored securely in production)
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
};

class AMCScheduler {
  constructor() {
    this.authToken = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Authenticate and get token
      await this.authenticate();
      this.isInitialized = true;
      logger('AMC Scheduler initialized successfully');
    } catch (error) {
      logger(`Failed to initialize AMC Scheduler: ${error.message}`);
      throw error;
    }
  }

  async authenticate() {
    try {
      const response = await axios.post(`${AMC_SCHEDULER_CONFIG.apiBaseUrl}/auth/login`, {
        email: AMC_SCHEDULER_CONFIG.adminCredentials.email,
        password: AMC_SCHEDULER_CONFIG.adminCredentials.password
      });

      if (response.data.status === 'success' && response.data.body.token) {
        this.authToken = response.data.body.token;
        logger('AMC Scheduler authenticated successfully');
      } else {
        throw new Error('Authentication failed: Invalid response');
      }
    } catch (error) {
      logger(`Authentication failed: ${error.message}`);
      throw error;
    }
  }

  async generateAMCs() {
    try {
      logger('Starting automatic AMC generation...');
      
      const response = await axios.post(
        `${AMC_SCHEDULER_CONFIG.apiBaseUrl}/amc/generate-automatic`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        const summary = response.data.body.summary;
        logger(`AMC generation completed: ${summary.successCount} success, ${summary.errorCount} errors, ${summary.skippedCount} skipped`);
        
        // Log detailed results
        if (response.data.body.results.success.length > 0) {
          logger(`Successfully generated AMCs for tickets: ${response.data.body.results.success.map(r => r.ticketCustomId).join(', ')}`);
        }
        
        if (response.data.body.results.errors.length > 0) {
          logger(`Errors during AMC generation: ${response.data.body.results.errors.map(r => r.error).join(', ')}`);
        }
      } else {
        throw new Error(`AMC generation failed: ${response.data.message}`);
      }
    } catch (error) {
      logger(`Error during AMC generation: ${error.message}`);
      
      // Try to re-authenticate if token expired
      if (error.response?.status === 401) {
        logger('Token expired, re-authenticating...');
        await this.authenticate();
        // Retry once
        return this.generateAMCs();
      }
    }
  }

  async calculatePenalties() {
    try {
      logger('Starting penalty calculation...');
      
      const response = await axios.post(
        `${AMC_SCHEDULER_CONFIG.apiBaseUrl}/amc/calculate-penalties`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        const summary = response.data.body.summary;
        logger(`Penalty calculation completed: ${summary.updatedCount} AMCs updated, ${summary.errorCount} errors`);
        
        // Log detailed results
        if (response.data.body.results.updated.length > 0) {
          logger(`Updated penalties for AMCs: ${response.data.body.results.updated.map(r => r.ticketCustomId).join(', ')}`);
        }
      } else {
        throw new Error(`Penalty calculation failed: ${response.data.message}`);
      }
    } catch (error) {
      logger(`Error during penalty calculation: ${error.message}`);
      
      // Try to re-authenticate if token expired
      if (error.response?.status === 401) {
        logger('Token expired, re-authenticating...');
        await this.authenticate();
        // Retry once
        return this.calculatePenalties();
      }
    }
  }

  startScheduler() {
    if (!this.isInitialized) {
      logger('Scheduler not initialized. Call initialize() first.');
      return;
    }

    // Schedule AMC generation every 11 months
    cron.schedule(AMC_SCHEDULER_CONFIG.amcGenerationCron, async () => {
      logger('Running scheduled AMC generation...');
      await this.generateAMCs();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Schedule penalty calculation daily
    cron.schedule(AMC_SCHEDULER_CONFIG.penaltyCalculationCron, async () => {
      logger('Running scheduled penalty calculation...');
      await this.calculatePenalties();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    logger('AMC Scheduler started successfully');
    logger(`AMC generation scheduled: ${AMC_SCHEDULER_CONFIG.amcGenerationCron}`);
    logger(`Penalty calculation scheduled: ${AMC_SCHEDULER_CONFIG.penaltyCalculationCron}`);
  }

  stopScheduler() {
    cron.destroy();
    logger('AMC Scheduler stopped');
  }
}

// Export for use in main application
module.exports = AMCScheduler;

// If running as standalone script
if (require.main === module) {
  const scheduler = new AMCScheduler();
  
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
      
      logger('AMC Scheduler is running. Press Ctrl+C to stop.');
    })
    .catch((error) => {
      logger(`Failed to start AMC Scheduler: ${error.message}`);
      process.exit(1);
    });
}

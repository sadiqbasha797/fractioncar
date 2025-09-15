const cron = require('node-cron');
const AMCReminderService = require('./amcReminderService');
const logger = require('./logger');

class CronService {
  static startCronJobs() {
    // AMC Reminder - Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        logger('Starting daily AMC reminder job...');
        const result = await AMCReminderService.checkAndSendReminders();
        logger(`Daily AMC reminder job completed. ${result.remindersSent} reminders sent to ${result.totalChecked} AMC records.`);
      } catch (error) {
        logger(`Error in daily AMC reminder job: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Clean up expired notifications - Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger('Starting daily notification cleanup job...');
        // MongoDB TTL index will handle this automatically
        logger('Daily notification cleanup job completed.');
      } catch (error) {
        logger(`Error in daily notification cleanup job: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    logger('Cron jobs started successfully');
  }

  static stopCronJobs() {
    cron.getTasks().forEach(task => {
      task.destroy();
    });
    logger('All cron jobs stopped');
  }
}

module.exports = CronService;

const cron = require('node-cron');
const AMCReminderService = require('./amcReminderService');
const AMCPenaltyService = require('./amcPenaltyService');
const UserStatusService = require('./userStatusService');
const BookingAvailabilityService = require('./bookingAvailabilityService');
const RetargetingNotificationService = require('./retargetingNotificationService');
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

    // AMC Penalty Check - Run daily at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      try {
        logger('Starting daily AMC penalty check job...');
        const result = await AMCPenaltyService.checkAndApplyPenalties();
        logger(`Daily AMC penalty check job completed. ${result.penaltiesApplied} penalties applied, total penalty amount: ₹${result.totalPenaltyAmount} for ${result.totalChecked} AMC records.`);
      } catch (error) {
        logger(`Error in daily AMC penalty check job: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // User Suspension Check - Run daily at 11:00 AM
    cron.schedule('0 11 * * *', async () => {
      try {
        logger('Starting daily user suspension check job...');
        const result = await UserStatusService.checkAndRemoveExpiredSuspensions();
        logger(`Daily user suspension check job completed. ${result.reactivatedCount} users automatically reactivated from ${result.totalChecked} suspended users.`);
      } catch (error) {
        logger(`Error in daily user suspension check job: ${error.message}`);
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

    // Booking Availability Check - Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      try {
        logger('Starting booking availability check job...');
        const result = await BookingAvailabilityService.checkAndStopBookings();
        logger(`Booking availability check completed. ${result.bookingsStopped} bookings stopped for ${result.totalChecked} cars checked.`);
      } catch (error) {
        logger(`Error in booking availability check job: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Retargeting Notifications - Run twice daily at 2:00 PM and 8:00 PM
    cron.schedule('0 14 * * *', async () => {
      try {
        logger('Starting afternoon retargeting notification job...');
        const result = await RetargetingNotificationService.checkAndSendRetargetingNotifications();
        logger(`Afternoon retargeting notification job completed. ${result.notificationsSent} notifications sent to ${result.usersNotified} users for ${result.carsPromoted} cars.`);
      } catch (error) {
        logger(`Error in afternoon retargeting notification job: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    cron.schedule('0 20 * * *', async () => {
      try {
        logger('Starting evening retargeting notification job...');
        const result = await RetargetingNotificationService.checkAndSendRetargetingNotifications();
        logger(`Evening retargeting notification job completed. ${result.notificationsSent} notifications sent to ${result.usersNotified} users for ${result.carsPromoted} cars.`);
      } catch (error) {
        logger(`Error in evening retargeting notification job: ${error.message}`);
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

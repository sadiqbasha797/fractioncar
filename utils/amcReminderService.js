const AMC = require('../models/amc');
const User = require('../models/User');
const Car = require('../models/Car');
const NotificationService = require('./notificationService');
const logger = require('./logger');

class AMCReminderService {
  // Check for AMC payments due in the next 30 days and send reminders
  static async checkAndSendReminders() {
    try {
      logger('Starting AMC reminder check...');
      
      // Get all AMC records
      const amcs = await AMC.find({})
        .populate('userid carid')
        .sort({ createdAt: -1 });

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      let remindersSent = 0;

      for (const amc of amcs) {
        if (!amc.userid || !amc.carid) continue;

        // Check each year's AMC payment
        for (const yearData of amc.amcamount) {
          if (yearData.paid || !yearData.duedate) continue;

          const dueDate = new Date(yearData.duedate);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

          // Send reminder if due within 30 days and not paid
          if (daysUntilDue <= 30 && daysUntilDue > 0) {
            try {
              await NotificationService.createAMCReminderNotification(
                amc.userid._id,
                amc,
                amc.carid,
                daysUntilDue
              );
              
              remindersSent++;
              logger(`AMC reminder sent to user ${amc.userid.email} for ${amc.carid.name} - ${daysUntilDue} days left`);
            } catch (error) {
              logger(`Error sending AMC reminder to user ${amc.userid.email}: ${error.message}`);
            }
          }
        }
      }

      logger(`AMC reminder check completed. ${remindersSent} reminders sent.`);
      return { remindersSent, totalChecked: amcs.length };
    } catch (error) {
      logger(`Error in AMC reminder check: ${error.message}`);
      throw error;
    }
  }

  // Get AMC records that need reminders (for manual checking)
  static async getAMCRecordsNeedingReminders() {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const amcs = await AMC.find({})
        .populate('userid carid')
        .sort({ createdAt: -1 });

      const recordsNeedingReminders = [];

      for (const amc of amcs) {
        if (!amc.userid || !amc.carid) continue;

        const unpaidYears = amc.amcamount.filter(year => 
          !year.paid && 
          year.duedate && 
          new Date(year.duedate) <= thirtyDaysFromNow &&
          new Date(year.duedate) > today
        );

        if (unpaidYears.length > 0) {
          recordsNeedingReminders.push({
            amc,
            unpaidYears: unpaidYears.map(year => ({
              year: year.year,
              amount: year.amount,
              dueDate: year.duedate,
              daysUntilDue: Math.ceil((new Date(year.duedate) - today) / (1000 * 60 * 60 * 24))
            }))
          });
        }
      }

      return recordsNeedingReminders;
    } catch (error) {
      logger(`Error getting AMC records needing reminders: ${error.message}`);
      throw error;
    }
  }

  // Send reminder for a specific AMC record
  static async sendReminderForAMC(amcId) {
    try {
      const amc = await AMC.findById(amcId)
        .populate('userid carid');

      if (!amc || !amc.userid || !amc.carid) {
        throw new Error('AMC record not found or missing user/car data');
      }

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      let remindersSent = 0;

      for (const yearData of amc.amcamount) {
        if (yearData.paid || !yearData.duedate) continue;

        const dueDate = new Date(yearData.duedate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 30 && daysUntilDue > 0) {
          await NotificationService.createAMCReminderNotification(
            amc.userid._id,
            amc,
            amc.carid,
            daysUntilDue
          );
          
          remindersSent++;
        }
      }

      return { remindersSent };
    } catch (error) {
      logger(`Error sending reminder for AMC ${amcId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AMCReminderService;

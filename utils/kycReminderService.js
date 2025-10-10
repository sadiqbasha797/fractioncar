const User = require('../models/User');
const NotificationService = require('./notificationService');
const { sendKycReminderEmail } = require('./emailService');
const logger = require('./logger');

class KYCReminderService {
  // Check for users with pending KYC status and send reminders
  static async checkAndSendReminders() {
    try {
      logger('Starting KYC reminder check...');
      
      // Get all users with pending KYC status
      const usersWithPendingKYC = await User.find({ 
        kycStatus: 'pending',
        status: 'active' // Only active users
      }).sort({ createdAt: -1 });

      let remindersSent = 0;
      const today = new Date();

      for (const user of usersWithPendingKYC) {
        try {
          // Calculate days since user registration
          const daysSinceRegistration = Math.ceil((today - user.createdAt) / (1000 * 60 * 60 * 24));
          
          // Send reminder if user has been registered for at least 1 day
          if (daysSinceRegistration >= 1) {
            try {
              // Send web notification
              await NotificationService.createKYCReminderNotification(
                user._id,
                user.name,
                daysSinceRegistration
              );
              
              // Send email notification
              await sendKycReminderEmail(user, daysSinceRegistration);
              
              remindersSent++;
              logger(`KYC reminder sent to user ${user.email} (both email and web) - ${daysSinceRegistration} days since registration`);
            } catch (notificationError) {
              logger(`Error sending KYC reminder to user ${user.email}: ${notificationError.message}`);
            }
          }
        } catch (error) {
          logger(`Error sending KYC reminder to user ${user.email}: ${error.message}`);
        }
      }

      logger(`KYC reminder check completed. ${remindersSent} reminders sent.`);
      return { remindersSent, totalChecked: usersWithPendingKYC.length };
    } catch (error) {
      logger(`Error in KYC reminder check: ${error.message}`);
      throw error;
    }
  }

  // Get users that need KYC reminders (for manual checking)
  static async getUsersNeedingKYCReminders() {
    try {
      const today = new Date();
      
      const usersWithPendingKYC = await User.find({ 
        kycStatus: 'pending',
        status: 'active' // Only active users
      }).sort({ createdAt: -1 });

      const usersNeedingReminders = [];

      for (const user of usersWithPendingKYC) {
        const daysSinceRegistration = Math.ceil((today - user.createdAt) / (1000 * 60 * 60 * 24));
        
        // Include users registered for at least 1 day
        if (daysSinceRegistration >= 1) {
          usersNeedingReminders.push({
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              createdAt: user.createdAt,
              kycStatus: user.kycStatus
            },
            daysSinceRegistration
          });
        }
      }

      return usersNeedingReminders;
    } catch (error) {
      logger(`Error getting users needing KYC reminders: ${error.message}`);
      throw error;
    }
  }

  // Send reminder for a specific user
  static async sendReminderForUser(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.kycStatus !== 'pending') {
        throw new Error('User KYC is not in pending status');
      }

      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }

      const today = new Date();
      const daysSinceRegistration = Math.ceil((today - user.createdAt) / (1000 * 60 * 60 * 24));

      // Send web notification
      await NotificationService.createKYCReminderNotification(
        user._id,
        user.name,
        daysSinceRegistration
      );

      // Send email notification
      await sendKycReminderEmail(user, daysSinceRegistration);

      logger(`KYC reminder sent to user ${user.email} (both email and web)`);
      return { success: true, daysSinceRegistration };
    } catch (error) {
      logger(`Error sending KYC reminder for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = KYCReminderService;

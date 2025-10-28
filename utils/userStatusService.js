const User = require('../models/User');
const NotificationService = require('./notificationService');
const logger = require('./logger');

class UserStatusService {
  // Suspend a user for 7 days
  static async suspendUser(userId, reason, changedBy) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'deactivated') {
        throw new Error('Cannot suspend a deactivated user');
      }

      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + 7); // 7 days from now

      user.status = 'suspended';
      user.suspensionEndDate = suspensionEndDate;
      user.suspensionReason = reason;
      user.statusChangedBy = {
        id: changedBy.id,
        role: changedBy.role,
        name: changedBy.name,
        email: changedBy.email
      };
      user.statusChangedAt = new Date();

      await user.save();

      // Send notifications
      try {
        // Send notification to user
        await NotificationService.createUserSuspensionNotification(
          userId,
          user.name,
          reason,
          suspensionEndDate
        );
        
        // Send notification to admins
        await NotificationService.createAdminUserStatusChangeNotification(
          user,
          'active',
          'suspended',
          reason,
          changedBy
        );
      } catch (notificationError) {
        logger(`Error sending suspension notifications for user ${userId}: ${notificationError.message}`);
      }

      logger(`User ${userId} suspended until ${suspensionEndDate} by ${changedBy.role} ${changedBy.name}`);
      return user;
    } catch (error) {
      logger(`Error suspending user ${userId}: ${error.message}`);
      throw error;
    }
  }

  // Deactivate a user permanently
  static async deactivateUser(userId, reason, changedBy) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.status = 'deactivated';
      user.suspensionEndDate = null; // Clear suspension date
      user.suspensionReason = null; // Clear suspension reason
      user.deactivationReason = reason;
      user.statusChangedBy = {
        id: changedBy.id,
        role: changedBy.role,
        name: changedBy.name,
        email: changedBy.email
      };
      user.statusChangedAt = new Date();

      await user.save();

      // Send notifications
      try {
        // Send notification to user
        await NotificationService.createUserDeactivationNotification(
          userId,
          user.name,
          reason
        );
        
        // Send notification to admins
        await NotificationService.createAdminUserStatusChangeNotification(
          user,
          user.status === 'suspended' ? 'suspended' : 'active',
          'deactivated',
          reason,
          changedBy
        );
      } catch (notificationError) {
        logger(`Error sending deactivation notifications for user ${userId}: ${notificationError.message}`);
      }

      logger(`User ${userId} deactivated by ${changedBy.role} ${changedBy.name}`);
      return user;
    } catch (error) {
      logger(`Error deactivating user ${userId}: ${error.message}`);
      throw error;
    }
  }

  // Reactivate a user (remove suspension or deactivation)
  static async reactivateUser(userId, reason, changedBy) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'active') {
        throw new Error('User is already active');
      }

      user.status = 'active';
      user.suspensionEndDate = null;
      user.suspensionReason = null;
      user.deactivationReason = null;
      user.statusChangedBy = {
        id: changedBy.id,
        role: changedBy.role,
        name: changedBy.name,
        email: changedBy.email
      };
      user.statusChangedAt = new Date();

      await user.save();

      // Send notifications
      try {
        // Send notification to user
        await NotificationService.createUserReactivationNotification(
          userId,
          user.name,
          reason
        );
        
        // Send notification to admins
        await NotificationService.createAdminUserStatusChangeNotification(
          user,
          user.status === 'suspended' ? 'suspended' : 'deactivated',
          'active',
          reason,
          changedBy
        );
      } catch (notificationError) {
        logger(`Error sending reactivation notifications for user ${userId}: ${notificationError.message}`);
      }

      logger(`User ${userId} reactivated by ${changedBy.role} ${changedBy.name}`);
      return user;
    } catch (error) {
      logger(`Error reactivating user ${userId}: ${error.message}`);
      throw error;
    }
  }

  // Check and remove expired suspensions
  static async checkAndRemoveExpiredSuspensions() {
    try {
      const now = new Date();
      
      const expiredSuspensions = await User.find({
        status: 'suspended',
        suspensionEndDate: { $lte: now }
      });

      let reactivatedCount = 0;

      for (const user of expiredSuspensions) {
        user.status = 'active';
        user.suspensionEndDate = null;
        user.suspensionReason = null;
        user.statusChangedBy = {
          id: null, // System automatic reactivation
          role: 'system',
          name: 'System',
          email: 'system@fraction.com'
        };
        user.statusChangedAt = new Date();

        await user.save();

        // Send notification to user
        try {
          await NotificationService.createUserSuspensionExpiredNotification(
            user._id,
            user.name
          );
        } catch (notificationError) {
          logger(`Error sending suspension expired notification to user ${user._id}: ${notificationError.message}`);
        }

        reactivatedCount++;
        logger(`User ${user._id} suspension automatically expired and user reactivated`);
      }

      logger(`Suspension check completed. ${reactivatedCount} users automatically reactivated`);
      return { reactivatedCount, totalChecked: expiredSuspensions.length };
    } catch (error) {
      logger(`Error checking expired suspensions: ${error.message}`);
      throw error;
    }
  }

  // Get users by status
  static async getUsersByStatus(status, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const users = await User.find({ status })
        .select('-password -logintoken -passwordtoken')
        .sort({ statusChangedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments({ status });

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total
        }
      };
    } catch (error) {
      logger(`Error getting users by status ${status}: ${error.message}`);
      throw error;
    }
  }

  // Get user status history
  static async getUserStatusHistory(userId) {
    try {
      const user = await User.findById(userId)
        .select('status suspensionEndDate suspensionReason deactivationReason statusChangedBy statusChangedAt createdAt');

      if (!user) {
        throw new Error('User not found');
      }

      return {
        currentStatus: user.status,
        suspensionEndDate: user.suspensionEndDate,
        suspensionReason: user.suspensionReason,
        deactivationReason: user.deactivationReason,
        statusChangedBy: user.statusChangedBy,
        statusChangedAt: user.statusChangedAt,
        accountCreatedAt: user.createdAt
      };
    } catch (error) {
      logger(`Error getting user status history for ${userId}: ${error.message}`);
      throw error;
    }
  }

  // Check if user can perform actions (not suspended or deactivated)
  static async canUserPerformActions(userId) {
    try {
      const user = await User.findById(userId).select('status suspensionEndDate');
      
      if (!user) {
        return { canPerform: false, reason: 'User not found' };
      }

      if (user.status === 'deactivated') {
        return { canPerform: false, reason: 'User account is deactivated' };
      }

      if (user.status === 'suspended') {
        const now = new Date();
        if (user.suspensionEndDate && user.suspensionEndDate > now) {
          return { 
            canPerform: false, 
            reason: 'User account is suspended',
            suspensionEndDate: user.suspensionEndDate
          };
        }
        // Suspension has expired, should be reactivated by cron job
        return { canPerform: true, reason: 'Suspension expired' };
      }

      return { canPerform: true, reason: 'User is active' };
    } catch (error) {
      logger(`Error checking user action permissions for ${userId}: ${error.message}`);
      return { canPerform: false, reason: 'Error checking user status' };
    }
  }

  // Get suspension statistics
  static async getSuspensionStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalUsers = await User.countDocuments();
      const suspendedUsers = await User.countDocuments({ 
        status: 'suspended',
        suspensionEndDate: { $gt: new Date() }
      });
      const expiredSuspensions = await User.countDocuments({ 
        status: 'suspended',
        suspensionEndDate: { $lte: new Date() }
      });

      return {
        totalUsers,
        active: stats.find(s => s._id === 'active')?.count || 0,
        suspended: suspendedUsers,
        deactivated: stats.find(s => s._id === 'deactivated')?.count || 0,
        expiredSuspensions
      };
    } catch (error) {
      logger(`Error getting suspension stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserStatusService;

const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const logger = require('./logger');

class NotificationService {
  // Create a notification for a specific user
  static async createUserNotification(userId, type, title, message, metadata = {}, relatedEntityId = null, relatedEntityModel = null) {
    try {
      const notification = new Notification({
        recipientId: userId,
        recipientModel: 'User',
        type,
        title,
        message,
        metadata,
        relatedEntityId,
        relatedEntityModel,
        priority: this.getPriorityForType(type)
      });

      await notification.save();
      logger(`Notification created for user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger(`Error creating user notification: ${error.message}`);
      throw error;
    }
  }

  // Create notifications for all admins and super admins
  static async createAdminNotification(type, title, message, metadata = {}, relatedEntityId = null, relatedEntityModel = null) {
    try {
      const notifications = [];
      
      // Get all admins and super admins
      const [admins, superAdmins] = await Promise.all([
        Admin.find({}),
        SuperAdmin.find({})
      ]);

      // Create notifications for admins
      for (const admin of admins) {
        const notification = new Notification({
          recipientId: admin._id,
          recipientModel: 'Admin',
          type,
          title,
          message,
          metadata,
          relatedEntityId,
          relatedEntityModel,
          priority: this.getPriorityForType(type)
        });
        notifications.push(notification);
      }

      // Create notifications for super admins
      for (const superAdmin of superAdmins) {
        const notification = new Notification({
          recipientId: superAdmin._id,
          recipientModel: 'SuperAdmin',
          type,
          title,
          message,
          metadata,
          relatedEntityId,
          relatedEntityModel,
          priority: this.getPriorityForType(type)
        });
        notifications.push(notification);
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        logger(`Notifications created for ${notifications.length} admin/superadmin users: ${type}`);
      }

      return notifications;
    } catch (error) {
      logger(`Error creating admin notifications: ${error.message}`);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, userRole, page = 1, limit = 20, unreadOnly = false) {
    try {
      const query = {
        recipientId: userId,
        recipientModel: userRole === 'user' ? 'User' : (userRole === 'admin' ? 'Admin' : 'SuperAdmin')
      };

      if (unreadOnly) {
        query.isRead = false;
      }

      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find(query)
        .populate('relatedEntityId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          unreadCount
        }
      };
    } catch (error) {
      logger(`Error getting user notifications: ${error.message}`);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId, userRole) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipientId: userId,
        recipientModel: userRole === 'user' ? 'User' : (userRole === 'admin' ? 'Admin' : 'SuperAdmin')
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      return notification;
    } catch (error) {
      logger(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId, userRole) {
    try {
      const result = await Notification.updateMany(
        {
          recipientId: userId,
          recipientModel: userRole === 'user' ? 'User' : (userRole === 'admin' ? 'Admin' : 'SuperAdmin'),
          isRead: false
        },
        {
          isRead: true,
          readAt: new Date()
        }
      );

      logger(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      logger(`Error marking all notifications as read: ${error.message}`);
      throw error;
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId, userId, userRole) {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        recipientId: userId,
        recipientModel: userRole === 'user' ? 'User' : (userRole === 'admin' ? 'Admin' : 'SuperAdmin')
      });

      if (!result) {
        throw new Error('Notification not found');
      }

      return result;
    } catch (error) {
      logger(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  // Get priority level for notification type
  static getPriorityForType(type) {
    const priorityMap = {
      'welcome': 'low',
      'booknow_token_created': 'medium',
      'token_created': 'medium',
      'ticket_created': 'medium',
      'amc_payment_done': 'medium',
      'amc_reminder': 'high',
      'booking_done': 'medium',
      'kyc_approved': 'high',
      'kyc_rejected': 'high',
      'user_joined_waitlist': 'medium',
      'user_purchased_token': 'medium',
      'user_purchased_booknow_token': 'medium',
      'user_created_ticket': 'medium',
      'user_paid_amc': 'medium',
      'user_made_booking': 'medium',
      'user_kyc_approved': 'high',
      'user_kyc_rejected': 'high'
    };

    return priorityMap[type] || 'medium';
  }

  // Create welcome notification for new user
  static async createWelcomeNotification(userId, userName) {
    return await this.createUserNotification(
      userId,
      'welcome',
      '🎉 Welcome to Fraction!',
      `Welcome ${userName}! Your account has been created successfully. Complete your KYC verification to start booking cars.`,
      { userName }
    );
  }

  // Create book now token notification for user
  static async createBookNowTokenNotification(userId, tokenDetails, carDetails) {
    return await this.createUserNotification(
      userId,
      'booknow_token_created',
      '🚀 Book Now Token Created!',
      `Your Book Now Token for ${carDetails.name} has been created successfully. You can now book this car immediately.`,
      { 
        tokenId: tokenDetails._id,
        carName: carDetails.name,
        amountPaid: tokenDetails.amountpaid
      },
      tokenDetails._id,
      'BookNowToken'
    );
  }

  // Create token notification for user (waitlist context)
  static async createTokenNotification(userId, tokenDetails, carDetails) {
    return await this.createUserNotification(
      userId,
      'token_created',
      '🎫 Token Purchased - You\'re on the Waitlist!',
      `You've purchased a token for ${carDetails.name}. You're now on the waitlist and will be notified when it's your turn to book.`,
      { 
        tokenId: tokenDetails._id,
        carName: carDetails.name,
        amountPaid: tokenDetails.amountpaid
      },
      tokenDetails._id,
      'Token'
    );
  }

  // Create ticket notification for user (share context)
  static async createTicketNotification(userId, ticketDetails, carDetails) {
    return await this.createUserNotification(
      userId,
      'ticket_created',
      '🎫 Share Ticket Created!',
      `Your share ticket for ${carDetails.name} has been created successfully. You now own a share in this car.`,
      { 
        ticketId: ticketDetails._id,
        carName: carDetails.name,
        ticketPrice: ticketDetails.ticketprice
      },
      ticketDetails._id,
      'Ticket'
    );
  }

  // Create AMC payment notification for user
  static async createAMCPaymentNotification(userId, amcDetails, carDetails) {
    return await this.createUserNotification(
      userId,
      'amc_payment_done',
      '🔧 AMC Payment Confirmed!',
      `Your Annual Maintenance Charge payment for ${carDetails.name} has been confirmed. Thank you for your payment.`,
      { 
        amcId: amcDetails._id,
        carName: carDetails.name,
        totalAmount: amcDetails.amcamount.reduce((sum, year) => sum + year.amount, 0)
      },
      amcDetails._id,
      'AMC'
    );
  }

  // Create AMC reminder notification for user
  static async createAMCReminderNotification(userId, amcDetails, carDetails, daysLeft) {
    return await this.createUserNotification(
      userId,
      'amc_reminder',
      '⚠️ AMC Payment Reminder',
      `Your Annual Maintenance Charge for ${carDetails.name} is due in ${daysLeft} days. Please make the payment to avoid penalties.`,
      { 
        amcId: amcDetails._id,
        carName: carDetails.name,
        daysLeft,
        amount: amcDetails.amcamount.find(year => !year.paid)?.amount || 0
      },
      amcDetails._id,
      'AMC'
    );
  }

  // Create booking notification for user
  static async createBookingNotification(userId, bookingDetails, carDetails) {
    return await this.createUserNotification(
      userId,
      'booking_done',
      '🚗 Booking Confirmed!',
      `Your booking for ${carDetails.name} has been confirmed. Enjoy your ride!`,
      { 
        bookingId: bookingDetails._id,
        carName: carDetails.name,
        bookingFrom: bookingDetails.bookingFrom,
        bookingTo: bookingDetails.bookingTo
      },
      bookingDetails._id,
      'Booking'
    );
  }

  // Create KYC approval notification for user
  static async createKYCApprovalNotification(userId, userName) {
    return await this.createUserNotification(
      userId,
      'kyc_approved',
      '✅ KYC Approved!',
      `Congratulations ${userName}! Your KYC documents have been approved. You can now book cars and purchase tokens.`,
      { userName }
    );
  }

  // Create KYC rejection notification for user
  static async createKYCRejectionNotification(userId, userName, rejectionComments) {
    return await this.createUserNotification(
      userId,
      'kyc_rejected',
      '❌ KYC Rejected',
      `Your KYC documents have been rejected. Reason: ${rejectionComments}. Please resubmit your documents.`,
      { userName, rejectionComments }
    );
  }

  // Create admin notification for user joining waitlist
  static async createUserJoinedWaitlistNotification(userDetails, tokenDetails, carDetails) {
    return await this.createAdminNotification(
      'user_joined_waitlist',
      '👤 User Joined Waitlist',
      `${userDetails.name} has purchased a token for ${carDetails.name} and joined the waitlist.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        tokenId: tokenDetails._id,
        carName: carDetails.name,
        amountPaid: tokenDetails.amountpaid
      },
      tokenDetails._id,
      'Token'
    );
  }

  // Create admin notification for user purchasing token
  static async createUserPurchasedTokenNotification(userDetails, tokenDetails, carDetails) {
    return await this.createAdminNotification(
      'user_purchased_token',
      '🎫 User Purchased Token',
      `${userDetails.name} has purchased a token for ${carDetails.name}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        tokenId: tokenDetails._id,
        carName: carDetails.name,
        amountPaid: tokenDetails.amountpaid
      },
      tokenDetails._id,
      'Token'
    );
  }

  // Create admin notification for user purchasing book now token
  static async createUserPurchasedBookNowTokenNotification(userDetails, tokenDetails, carDetails) {
    return await this.createAdminNotification(
      'user_purchased_booknow_token',
      '🚀 User Purchased Book Now Token',
      `${userDetails.name} has purchased a book now token for ${carDetails.name}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        tokenId: tokenDetails._id,
        carName: carDetails.name,
        amountPaid: tokenDetails.amountpaid
      },
      tokenDetails._id,
      'BookNowToken'
    );
  }

  // Create admin notification for user creating ticket
  static async createUserCreatedTicketNotification(userDetails, ticketDetails, carDetails) {
    return await this.createAdminNotification(
      'user_created_ticket',
      '🎫 User Created Share Ticket',
      `${userDetails.name} has created a share ticket for ${carDetails.name}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        ticketId: ticketDetails._id,
        carName: carDetails.name,
        ticketPrice: ticketDetails.ticketprice
      },
      ticketDetails._id,
      'Ticket'
    );
  }

  // Create admin notification for user paying AMC
  static async createUserPaidAMCNotification(userDetails, amcDetails, carDetails) {
    return await this.createAdminNotification(
      'user_paid_amc',
      '🔧 User Paid AMC',
      `${userDetails.name} has made an AMC payment for ${carDetails.name}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        amcId: amcDetails._id,
        carName: carDetails.name,
        totalAmount: amcDetails.amcamount.reduce((sum, year) => sum + year.amount, 0)
      },
      amcDetails._id,
      'AMC'
    );
  }

  // Create admin notification for user making booking
  static async createUserMadeBookingNotification(userDetails, bookingDetails, carDetails) {
    return await this.createAdminNotification(
      'user_made_booking',
      '🚗 User Made Booking',
      `${userDetails.name} has made a booking for ${carDetails.name}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        bookingId: bookingDetails._id,
        carName: carDetails.name,
        bookingFrom: bookingDetails.bookingFrom,
        bookingTo: bookingDetails.bookingTo
      },
      bookingDetails._id,
      'Booking'
    );
  }

  // Create admin notification for user KYC approval
  static async createUserKYCApprovalNotification(userDetails) {
    return await this.createAdminNotification(
      'user_kyc_approved',
      '✅ User KYC Approved',
      `${userDetails.name}'s KYC documents have been approved.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        userId: userDetails._id
      },
      userDetails._id,
      'User'
    );
  }

  // Create admin notification for user KYC rejection
  static async createUserKYCRejectionNotification(userDetails, rejectionComments) {
    return await this.createAdminNotification(
      'user_kyc_rejected',
      '❌ User KYC Rejected',
      `${userDetails.name}'s KYC documents have been rejected. Reason: ${rejectionComments}.`,
      { 
        userName: userDetails.name,
        userEmail: userDetails.email,
        userId: userDetails._id,
        rejectionComments
      },
      userDetails._id,
      'User'
    );
  }
}

module.exports = NotificationService;

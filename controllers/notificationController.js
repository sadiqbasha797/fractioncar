const NotificationService = require('../utils/notificationService');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const logger = require('../utils/logger');

// Get notifications for the authenticated user
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NotificationService.getUserNotifications(
      userId,
      userRole,
      parseInt(page),
      parseInt(limit),
      unreadOnly === 'true'
    );

    res.json({
      status: 'success',
      body: result,
      message: 'Notifications retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getNotifications: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NotificationService.getUserNotifications(
      userId,
      userRole,
      1,
      1,
      true
    );

    res.json({
      status: 'success',
      body: { unreadCount: result.pagination.unreadCount },
      message: 'Unread count retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getUnreadCount: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const notification = await NotificationService.markAsRead(
      notificationId,
      userId,
      userRole
    );

    res.json({
      status: 'success',
      body: { notification },
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger(`Error in markAsRead: ${error.message}`);
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NotificationService.markAllAsRead(userId, userRole);

    res.json({
      status: 'success',
      body: { modifiedCount: result.modifiedCount },
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger(`Error in markAllAsRead: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const notification = await NotificationService.deleteNotification(
      notificationId,
      userId,
      userRole
    );

    res.json({
      status: 'success',
      body: {},
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteNotification: ${error.message}`);
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get notification statistics (for admin/superadmin)
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin and superadmin can access this
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied'
      });
    }

    const result = await NotificationService.getUserNotifications(
      userId,
      userRole,
      1,
      1,
      false
    );

    const stats = {
      totalNotifications: result.pagination.totalNotifications,
      unreadNotifications: result.pagination.unreadCount,
      readNotifications: result.pagination.totalNotifications - result.pagination.unreadCount
    };

    res.json({
      status: 'success',
      body: { stats },
      message: 'Notification statistics retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getNotificationStats: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Create manual notification (Admin/SuperAdmin only)
const createNotification = async (req, res) => {
  try {
    const {
      recipientType,
      recipientId,
      recipientRole,
      title,
      message,
      type,
      priority = 'medium',
      metadata = {},
      expiresAt
    } = req.body;

    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or SuperAdmin role required.'
      });
    }

    let notifications = [];

    if (recipientType === 'specific') {
      // Send to specific user
      if (!recipientId || !recipientRole) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Recipient ID and role are required for specific notifications'
        });
      }

      const notification = new Notification({
        recipientId,
        recipientModel: recipientRole === 'user' ? 'User' : (recipientRole === 'admin' ? 'Admin' : 'SuperAdmin'),
        title,
        message,
        type,
        priority,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      await notification.save();
      notifications.push(notification);
    } else if (recipientType === 'all_users') {
      // Send to all users
      const users = await User.find({});
      for (const user of users) {
        const notification = new Notification({
          recipientId: user._id,
          recipientModel: 'User',
          title,
          message,
          type,
          priority,
          metadata,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });
        notifications.push(notification);
      }
      await Notification.insertMany(notifications);
    } else if (recipientType === 'all_admins') {
      // Send to all admins
      const admins = await Admin.find({});
      for (const admin of admins) {
        const notification = new Notification({
          recipientId: admin._id,
          recipientModel: 'Admin',
          title,
          message,
          type,
          priority,
          metadata,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });
        notifications.push(notification);
      }
      await Notification.insertMany(notifications);
    } else if (recipientType === 'all_superadmins') {
      // Send to all superadmins
      const superAdmins = await SuperAdmin.find({});
      for (const superAdmin of superAdmins) {
        const notification = new Notification({
          recipientId: superAdmin._id,
          recipientModel: 'SuperAdmin',
          title,
          message,
          type,
          priority,
          metadata,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });
        notifications.push(notification);
      }
      await Notification.insertMany(notifications);
    } else if (recipientType === 'role_based') {
      // Send to all users of specific role
      if (!recipientRole) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Recipient role is required for role-based notifications'
        });
      }

      let recipients = [];
      let model = '';
      
      if (recipientRole === 'user') {
        recipients = await User.find({});
        model = 'User';
      } else if (recipientRole === 'admin') {
        recipients = await Admin.find({});
        model = 'Admin';
      } else if (recipientRole === 'superadmin') {
        recipients = await SuperAdmin.find({});
        model = 'SuperAdmin';
      }

      for (const recipient of recipients) {
        const notification = new Notification({
          recipientId: recipient._id,
          recipientModel: model,
          title,
          message,
          type,
          priority,
          metadata,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });
        notifications.push(notification);
      }
      await Notification.insertMany(notifications);
    }

    logger(`Manual notification created by ${userRole} ${req.user.id}: ${type} to ${recipientType}`);

    res.status(201).json({
      status: 'success',
      body: {
        notifications: notifications.length,
        recipientType,
        type
      },
      message: `Notification sent successfully to ${notifications.length} recipient(s)`
    });
  } catch (error) {
    logger(`Error in createNotification: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all notifications (Admin/SuperAdmin only)
const getAllNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or SuperAdmin role required.'
      });
    }

    const {
      page = 1,
      limit = 20,
      type,
      priority,
      isRead,
      recipientModel,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (recipientModel) query.recipientModel = recipientModel;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const notifications = await Notification.find(query)
      .populate('recipientId', 'name email')
      .populate('relatedEntityId')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    res.json({
      status: 'success',
      body: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          unreadCount
        }
      },
      message: 'All notifications retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAllNotifications: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get notification by ID (Admin/SuperAdmin only)
const getNotificationById = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or SuperAdmin role required.'
      });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId)
      .populate('recipientId', 'name email')
      .populate('relatedEntityId');

    if (!notification) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Notification not found'
      });
    }

    res.json({
      status: 'success',
      body: { notification },
      message: 'Notification retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getNotificationById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update notification (Admin/SuperAdmin only)
const updateNotification = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or SuperAdmin role required.'
      });
    }

    const { notificationId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.recipientId;
    delete updateData.recipientModel;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      updateData,
      { new: true, runValidators: true }
    ).populate('recipientId', 'name email');

    if (!notification) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Notification not found'
      });
    }

    logger(`Notification updated by ${userRole} ${req.user.id}: ${notificationId}`);

    res.json({
      status: 'success',
      body: { notification },
      message: 'Notification updated successfully'
    });
  } catch (error) {
    logger(`Error in updateNotification: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Admin delete notification (Admin/SuperAdmin only)
const adminDeleteNotification = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. Admin or SuperAdmin role required.'
      });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Notification not found'
      });
    }

    logger(`Notification deleted by ${userRole} ${req.user.id}: ${notificationId}`);

    res.json({
      status: 'success',
      body: {},
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger(`Error in adminDeleteNotification: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Send test notification (SuperAdmin only)
const sendTestNotification = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Access denied. SuperAdmin role required.'
      });
    }

    const { title, message, type } = req.body;
    const userId = req.user.id;

    const notification = new Notification({
      recipientId: userId,
      recipientModel: 'SuperAdmin',
      title: title || 'Test Notification',
      message: message || 'This is a test notification to verify the system is working correctly.',
      type: type || 'manual_announcement',
      priority: 'medium',
      metadata: {
        test: true,
        sentBy: userId
      }
    });

    await notification.save();

    logger(`Test notification sent by SuperAdmin ${userId}`);

    res.json({
      status: 'success',
      body: { notification },
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    logger(`Error in sendTestNotification: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  adminDeleteNotification,
  sendTestNotification
};

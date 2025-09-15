const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Get notifications for the authenticated user
router.get('/', authMiddleware(['user', 'admin', 'superadmin']), getNotifications);

// Get unread notification count
router.get('/unread-count', authMiddleware(['user', 'admin', 'superadmin']), getUnreadCount);

// Mark a specific notification as read
router.patch('/:notificationId/read', authMiddleware(['user', 'admin', 'superadmin']), markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authMiddleware(['user', 'admin', 'superadmin']), markAllAsRead);

// Delete a notification (user deletes their own)
router.delete('/:notificationId', authMiddleware(['user', 'admin', 'superadmin']), deleteNotification);

// Get notification statistics (admin/superadmin only)
router.get('/stats', authMiddleware(['admin', 'superadmin']), getNotificationStats);

// ==================== ADMIN/SUPERADMIN ROUTES ====================

// Create manual notification (Admin/SuperAdmin only)
router.post('/admin/create', authMiddleware(['admin', 'superadmin']), createNotification);

// Get all notifications (Admin/SuperAdmin only)
router.get('/admin/all', authMiddleware(['admin', 'superadmin']), getAllNotifications);

// Get notification by ID (Admin/SuperAdmin only)
router.get('/admin/:notificationId', authMiddleware(['admin', 'superadmin']), getNotificationById);

// Update notification (Admin/SuperAdmin only)
router.put('/admin/:notificationId', authMiddleware(['admin', 'superadmin']), updateNotification);

// Delete notification (Admin/SuperAdmin only)
router.delete('/admin/:notificationId', authMiddleware(['admin', 'superadmin']), adminDeleteNotification);

// Send test notification (SuperAdmin only)
router.post('/admin/test', authMiddleware(['superadmin']), sendTestNotification);

module.exports = router;

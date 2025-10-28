const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const uploadKycDocument = require('../config/kycMulter');

// All routes require user authentication
router.use(authMiddleware(['user', 'admin', 'superadmin']));

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Upload profile image
router.post('/profile/image', upload.single('image'), userController.uploadProfileImage);

// Update government ID
router.put('/profile/government-id', userController.updateGovernmentId);

// Get all users (admin/superadmin only)
router.get('/', userController.getAllUsers);

// Create user (admin/superadmin only)
router.post('/', uploadKycDocument.single('kycFile'), userController.createUser);

// Update user by ID (admin/superadmin only)
router.put('/:userId', uploadKycDocument.single('kycFile'), userController.updateUserById);

// Delete user by ID (admin/superadmin only)
router.delete('/:userId', userController.deleteUserById);

// User status management routes (admin/superadmin only)
router.post('/:userId/suspend', userController.suspendUser);
router.post('/:userId/deactivate', userController.deactivateUser);
router.post('/:userId/reactivate', userController.reactivateUser);
router.get('/status/:status', userController.getUsersByStatus);
router.get('/:userId/status-history', userController.getUserStatusHistory);
router.get('/stats/suspensions', userController.getSuspensionStats);
router.get('/:userId/permissions', userController.checkUserPermissions);

// Email notification preferences routes
router.get('/email-notifications/preferences', userController.getEmailNotificationPreferences);
router.put('/email-notifications/preferences', userController.updateEmailNotificationPreferences);

module.exports = router;
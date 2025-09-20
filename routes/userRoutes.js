const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

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
router.post('/', userController.createUser);

// Update user by ID (admin/superadmin only)
router.put('/:userId', userController.updateUserById);

// Delete user by ID (admin/superadmin only)
router.delete('/:userId', userController.deleteUserById);

module.exports = router;
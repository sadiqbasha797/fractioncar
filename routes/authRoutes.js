const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// User routes
router.post('/register/user', authController.registerUser);
router.post('/login/user', authController.loginUser);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationCode);

// Password reset routes
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Admin routes
router.post('/register/admin', authController.registerAdmin);
router.post('/login/admin', authController.loginAdmin);

// Super Admin routes
router.post('/register/superadmin', authController.registerSuperAdmin);
router.post('/login/superadmin', authController.loginSuperAdmin);
// Protected route to get user profile
router.get('/profile', authMiddleware(['user', 'admin', 'superadmin']), authController.getProfile);

// Route to validate token
router.get('/validate-token', authMiddleware(['user', 'admin', 'superadmin']), authController.validateToken);


module.exports = router;
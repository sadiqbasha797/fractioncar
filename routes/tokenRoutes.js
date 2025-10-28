const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const authMiddleware = require('../middleware/authMiddleware');

// Create token (User can create for themselves, Admin/SuperAdmin can create for any user)
router.post('/', authMiddleware(['user', 'admin', 'superadmin']), tokenController.createToken);

// Get tokens (User: own tokens, Admin/SuperAdmin: all tokens)
router.get('/', authMiddleware(['user', 'admin', 'superadmin']), tokenController.getTokens);

// Get token by ID (User: own tokens, Admin/SuperAdmin: all tokens)
router.get('/:id', authMiddleware(['user', 'admin', 'superadmin']), tokenController.getTokenById);

// Update token (User can update own tokens, Admin/SuperAdmin can update any token)
router.put('/:id', authMiddleware(['user', 'admin', 'superadmin']), tokenController.updateToken);

// Delete token (Admin/SuperAdmin only)
router.delete('/:id', authMiddleware(['admin', 'superadmin']), tokenController.deleteToken);

// Request token cancellation (User can request cancellation for their own tokens)
router.post('/:id/cancel', authMiddleware(['user', 'admin', 'superadmin']), tokenController.requestTokenCancellation);

// Approve token refund request (Admin/SuperAdmin only)
router.post('/:id/approve-refund', authMiddleware(['admin', 'superadmin']), tokenController.approveTokenRefund);

// Reject token refund request (Admin/SuperAdmin only)
router.post('/:id/reject-refund', authMiddleware(['admin', 'superadmin']), tokenController.rejectTokenRefund);

module.exports = router;
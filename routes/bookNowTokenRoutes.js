const express = require('express');
const router = express.Router();
const bookNowTokenController = require('../controllers/bookNowTokenController');
const authMiddleware = require('../middleware/authMiddleware');

// Create book now token (User, Admin, SuperAdmin)
router.post('/', authMiddleware(['user', 'admin', 'superadmin']), bookNowTokenController.createBookNowToken);

// Get book now tokens (User: own tokens, Admin: all tokens, SuperAdmin: all tokens)
router.get('/', authMiddleware(['user', 'admin', 'superadmin']), bookNowTokenController.getBookNowTokens);

// Get book now token by ID (User: own tokens, Admin: all tokens, SuperAdmin: all tokens)
router.get('/:id', authMiddleware(['user', 'admin', 'superadmin']), bookNowTokenController.getBookNowTokenById);

// Update book now token (Admin only)
router.put('/:id', authMiddleware(['admin', 'superadmin']), bookNowTokenController.updateBookNowToken);

// Delete book now token (Admin/SuperAdmin only)
router.delete('/:id', authMiddleware(['admin', 'superadmin']), bookNowTokenController.deleteBookNowToken);

// Request book now token cancellation (User can request cancellation for their own tokens)
router.post('/:id/cancel', authMiddleware(['user', 'admin', 'superadmin']), bookNowTokenController.requestBookNowTokenCancellation);

// Approve book now token refund request (Admin/SuperAdmin only)
router.post('/:id/approve-refund', authMiddleware(['admin', 'superadmin']), bookNowTokenController.approveBookNowTokenRefund);

// Reject book now token refund request (Admin/SuperAdmin only)
router.post('/:id/reject-refund', authMiddleware(['admin', 'superadmin']), bookNowTokenController.rejectBookNowTokenRefund);

module.exports = router;

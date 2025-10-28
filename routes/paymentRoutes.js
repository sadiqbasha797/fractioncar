const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  getOrderDetails,
  getAllPayments,
  getPaymentStats,
  initiateRefund,
  getRefundDetails,
  getAllRefunds,
  getUserRefunds,
  cancelRefund,
  processRefundWebhook,
  refundPayment,
  processTokenRefund
} = require('../controllers/paymentController');

// Create Razorpay order
router.post('/create-order', createOrder);

// Verify payment
router.post('/verify-payment', verifyPayment);

// Get payment details
router.get('/payment/:payment_id', getPaymentDetails);

// Get order details
router.get('/order/:order_id', getOrderDetails);

// Get all payments/transactions
router.get('/transactions', getAllPayments);

// Get payment statistics
router.get('/stats', getPaymentStats);

// Refund management routes (protected with superadmin authentication)
router.post('/refund/initiate', authMiddleware(['superadmin']), initiateRefund);
router.get('/refund/:refundId', authMiddleware(['superadmin']), getRefundDetails);
router.get('/refunds', authMiddleware(['superadmin']), getAllRefunds);
router.get('/refunds/user/:userId', authMiddleware(['superadmin']), getUserRefunds);
router.put('/refund/:refundId/cancel', authMiddleware(['superadmin']), cancelRefund);
router.post('/refund/webhook', processRefundWebhook); // Webhook doesn't need auth

// Legacy refund endpoint
router.post('/refund', refundPayment);

// Process token refund (Admin/SuperAdmin only)
router.post('/refund/:tokenType/:tokenId', authMiddleware(['admin', 'superadmin']), processTokenRefund);

module.exports = router;

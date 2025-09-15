const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  getOrderDetails,
  refundPayment
} = require('../controllers/paymentController');

// Create Razorpay order
router.post('/create-order', createOrder);

// Verify payment
router.post('/verify-payment', verifyPayment);

// Get payment details
router.get('/payment/:payment_id', getPaymentDetails);

// Get order details
router.get('/order/:order_id', getOrderDetails);

// Refund payment
router.post('/refund', refundPayment);

module.exports = router;

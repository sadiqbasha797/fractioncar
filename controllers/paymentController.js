const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const RefundService = require('../utils/refundService');

// Create Razorpay order
const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Payment ID, and Signature are required'
      });
    }

    // Create signature for verification
    const body = order_id + '|' + payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOR_PAY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === signature;

    if (isAuthentic) {
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          order_id,
          payment_id,
          signature
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Get payment details
const getPaymentDetails = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await razorpay.payments.fetch(payment_id);

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await razorpay.orders.fetch(order_id);

    res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
};

// Get all payments/transactions with pagination
const getAllPayments = async (req, res) => {
  try {
    const { 
      count = 100, 
      skip = 0, 
      from, 
      to,
      status,
      method 
    } = req.query;

    // Build options object
    const options = {
      count: Math.min(parseInt(count), 100), // Limit to max 100 per request
      skip: parseInt(skip)
    };

    // Add date filters if provided
    if (from) {
      options.from = Math.floor(new Date(from).getTime() / 1000); // Convert to Unix timestamp
    }
    if (to) {
      options.to = Math.floor(new Date(to).getTime() / 1000); // Convert to Unix timestamp
    }

    // Fetch payments from Razorpay
    const payments = await razorpay.payments.all(options);

    // Filter by status or method if provided
    let filteredPayments = payments.items;
    if (status) {
      filteredPayments = filteredPayments.filter(payment => 
        payment.status.toLowerCase() === status.toLowerCase()
      );
    }
    if (method) {
      filteredPayments = filteredPayments.filter(payment => 
        payment.method && payment.method.toLowerCase() === method.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments: filteredPayments,
        count: filteredPayments.length,
        has_more: payments.has_more,
        total_count: payments.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Get payments for the specified period
    const options = {
      count: 100
    };

    if (from) {
      options.from = Math.floor(new Date(from).getTime() / 1000);
    }
    if (to) {
      options.to = Math.floor(new Date(to).getTime() / 1000);
    }

    const payments = await razorpay.payments.all(options);
    
    // Calculate statistics
    const stats = {
      total_payments: payments.items.length,
      successful_payments: payments.items.filter(p => p.status === 'captured').length,
      failed_payments: payments.items.filter(p => p.status === 'failed').length,
      pending_payments: payments.items.filter(p => p.status === 'created' || p.status === 'authorized').length,
      total_amount: payments.items.reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100, // Convert from paise to rupees
      successful_amount: payments.items
        .filter(p => p.status === 'captured')
        .reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100,
      methods: {}
    };

    // Group by payment methods
    payments.items.forEach(payment => {
      if (payment.method) {
        stats.methods[payment.method] = (stats.methods[payment.method] || 0) + 1;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment statistics retrieved successfully',
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
};

// Find transaction by payment ID
const findTransactionByPaymentId = async (paymentId) => {
  try {
    const Token = require('../models/Token');
    const BookNowToken = require('../models/BookNowToken');
    const AMC = require('../models/AMC');

    // Search in Token model
    let token = await Token.findOne({ razorpayPaymentId: paymentId });
    if (token) {
      return { type: 'token', id: token._id, data: token };
    }

    // Search in BookNowToken model
    let bookNowToken = await BookNowToken.findOne({ razorpayPaymentId: paymentId });
    if (bookNowToken) {
      return { type: 'booknowtoken', id: bookNowToken._id, data: bookNowToken };
    }

    // Search in AMC model
    let amc = await AMC.findOne({ 'amcamount.razorpayPaymentId': paymentId });
    if (amc) {
      return { type: 'amc', id: amc._id, data: amc };
    }

    return null;
  } catch (error) {
    console.error('Error finding transaction by payment ID:', error);
    throw error;
  }
};

// Initiate refund for a payment
const initiateRefund = async (req, res) => {
  try {
    console.log('Refund initiation request:', req.body);
    console.log('User from auth middleware:', req.user);
    
    const { 
      paymentId, 
      refundAmount, 
      reason
    } = req.body;

    if (!paymentId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and reason are required'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const refundedBy = req.user.id;

    // Find the transaction by payment ID
    console.log('Finding transaction for payment ID:', paymentId);
    const transaction = await findTransactionByPaymentId(paymentId);
    
    if (!transaction) {
      console.log('No transaction found for payment ID:', paymentId);
      console.log('Searching in all models...');
      
      // Debug: Check what tokens exist
      const Token = require('../models/Token');
      const BookNowToken = require('../models/BookNowToken');
      const AMC = require('../models/AMC');
      
      const allTokens = await Token.find({}).limit(5).select('razorpayPaymentId customtokenid');
      const allBookNowTokens = await BookNowToken.find({}).limit(5).select('razorpayPaymentId customtokenid');
      
      console.log('Sample tokens with payment IDs:', allTokens);
      console.log('Sample book now tokens with payment IDs:', allBookNowTokens);
      
      return res.status(404).json({
        success: false,
        message: 'Transaction not found for this payment ID'
      });
    }

    console.log('Found transaction:', transaction);

    const result = await RefundService.initiateRefund(
      paymentId,
      refundAmount,
      reason,
      refundedBy,
      transaction.type,
      transaction.id
    );

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in initiateRefund controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate refund',
      error: error.message
    });
  }
};

// Get refund details
const getRefundDetails = async (req, res) => {
  try {
    const Refund = require('../models/Refund');
    const { refundId } = req.params;

    const refund = await Refund.findById(refundId)
      .populate('userId', 'name email')
      .populate('refundedBy', 'name email');

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Refund details retrieved successfully',
      refund
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get refund details',
      error: error.message
    });
  }
};

// Get all refunds (admin)
const getAllRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await RefundService.getAllRefunds(
      parseInt(page),
      parseInt(limit),
      status
    );

    res.status(200).json({
      success: true,
      message: 'Refunds retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get refunds',
      error: error.message
    });
  }
};

// Get user refunds
const getUserRefunds = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await RefundService.getUserRefunds(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: 'User refunds retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user refunds',
      error: error.message
    });
  }
};

// Cancel refund
const cancelRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { reason } = req.body;

    const result = await RefundService.cancelRefund(refundId, reason);

    res.status(200).json({
      success: true,
      message: 'Refund cancelled successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel refund',
      error: error.message
    });
  }
};

// Process refund webhook (called by Razorpay)
const processRefundWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    if (event === 'refund.processed') {
      await RefundService.processRefund(payload.refund.id);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process refund webhook',
      error: error.message
    });
  }
};

// Refund payment (legacy - keeping for backward compatibility)
const refundPayment = async (req, res) => {
  try {
    const { payment_id, amount, notes } = req.body;

    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const refundOptions = {
      payment_id,
      amount: amount ? amount * 100 : undefined, // Convert to paise if amount provided
      notes: notes || {}
    };

    const refund = await razorpay.payments.refund(payment_id, refundOptions);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

module.exports = {
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
  refundPayment
};

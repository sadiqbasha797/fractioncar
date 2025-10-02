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

// Get all payments/transactions with pagination from database
const getAllPayments = async (req, res) => {
  try {
    const { 
      count = 10, 
      skip = 0, 
      from, 
      to,
      status,
      method 
    } = req.query;

    const Token = require('../models/token');
    const BookNowToken = require('../models/bookNowToken');
    const AMC = require('../models/amc');

    // Build query filters
    let query = {};
    
    // Add date filters if provided
    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        query.createdAt.$lte = new Date(to);
      }
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Add method filter if provided (this would need to be stored in your models)
    if (method) {
      query.paymentMethod = method;
    }

    // Get all payments from different models
    const [tokens, bookNowTokens, amcs] = await Promise.all([
      Token.find({ ...query, razorpayPaymentId: { $exists: true, $ne: null } })
        .populate('userid', 'name email phone')
        .populate('carid', 'carname brandname')
        .sort({ createdAt: -1 }),
      BookNowToken.find({ ...query, razorpayPaymentId: { $exists: true, $ne: null } })
        .populate('userid', 'name email phone')
        .populate('carid', 'carname brandname')
        .sort({ createdAt: -1 }),
      AMC.find({ ...query, 'amcamount.razorpayPaymentId': { $exists: true, $ne: null } })
        .populate('userid', 'name email phone')
        .populate('carid', 'carname brandname')
        .sort({ createdAt: -1 })
    ]);

    // Transform data to match Razorpay format
    const allPayments = [];

    // Process tokens
    tokens.forEach(token => {
      allPayments.push({
        id: token.razorpayPaymentId,
        entity: 'payment',
        amount: token.amountpaid * 100, // Convert to paise
        currency: 'INR',
        status: 'captured',
        order_id: token.customtokenid,
        method: 'upi', // Default method, you can store this in your model
        email: token.userid?.email || 'user@example.com',
        contact: token.userid?.phone || '+919999999999',
        created_at: Math.floor(new Date(token.createdAt).getTime() / 1000),
        description: `Token purchase for ${token.carid?.carname || 'Car'}`,
        type: 'token',
        transactionId: token._id
      });
    });

    // Process book now tokens
    bookNowTokens.forEach(bookNowToken => {
      allPayments.push({
        id: bookNowToken.razorpayPaymentId,
        entity: 'payment',
        amount: bookNowToken.amountpaid * 100, // Convert to paise
        currency: 'INR',
        status: 'captured',
        order_id: bookNowToken.customtokenid,
        method: 'upi', // Default method
        email: bookNowToken.userid?.email || 'user@example.com',
        contact: bookNowToken.userid?.phone || '+919999999999',
        created_at: Math.floor(new Date(bookNowToken.createdAt).getTime() / 1000),
        description: `Book now token purchase for ${bookNowToken.carid?.carname || 'Car'}`,
        type: 'booknowtoken',
        transactionId: bookNowToken._id
      });
    });

    // Process AMC payments
    amcs.forEach(amc => {
      if (amc.amcamount && amc.amcamount.razorpayPaymentId) {
        allPayments.push({
          id: amc.amcamount.razorpayPaymentId,
          entity: 'payment',
          amount: amc.amcamount.amount * 100, // Convert to paise
          currency: 'INR',
          status: 'captured',
          order_id: amc.amcamount.orderId || `amc_${amc._id}`,
          method: 'upi', // Default method
          email: amc.userid?.email || 'user@example.com',
          contact: amc.userid?.phone || '+919999999999',
          created_at: Math.floor(new Date(amc.createdAt).getTime() / 1000),
          description: `AMC payment for ${amc.carid?.carname || 'Car'}`,
          type: 'amc',
          transactionId: amc._id
        });
      }
    });

    // Sort by creation date (newest first)
    allPayments.sort((a, b) => b.created_at - a.created_at);

    // Apply pagination
    const totalCount = allPayments.length;
    const startIndex = parseInt(skip);
    const endIndex = startIndex + parseInt(count);
    const paginatedPayments = allPayments.slice(startIndex, endIndex);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(count));
    const currentPage = Math.floor(parseInt(skip) / parseInt(count)) + 1;
    const hasMore = endIndex < totalCount;

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments: paginatedPayments,
        count: paginatedPayments.length,
        has_more: hasMore,
        total_count: totalCount,
        pagination: {
          currentPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(count)
        }
      }
    });
  } catch (error) {
    console.error('Error in getAllPayments:', error);
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
    const Token = require('../models/token');
    const BookNowToken = require('../models/bookNowToken');
    const AMC = require('../models/amc');

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
      const Token = require('../models/token');
      const BookNowToken = require('../models/bookNowToken');
      const AMC = require('../models/amc');
      
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

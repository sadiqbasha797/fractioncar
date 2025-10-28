const razorpay = require('../config/razorpay');
const RefundService = require('../utils/refundService');
const crypto = require('crypto');
const Token = require('../models/token');
const BookNowToken = require('../models/bookNowToken');
const NotificationService = require('../utils/notificationService');
const logger = require('../utils/logger');

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

// Get all payments/transactions with pagination from Razorpay API
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

    // First, get all payments to determine total count
    const allOptions = {
      count: 100 // Get more records to ensure we have accurate count
    };

    // Add date filters if provided
    if (from) {
      allOptions.from = Math.floor(new Date(from).getTime() / 1000);
    }
    if (to) {
      allOptions.to = Math.floor(new Date(to).getTime() / 1000);
    }

    // Get all payments from Razorpay API to determine total count
    const allPayments = await razorpay.payments.all(allOptions);
    
    // Apply filters to get the actual filtered list
    let filteredPayments = allPayments.items;

    // Filter by status if provided
    if (status) {
      filteredPayments = filteredPayments.filter(payment => payment.status === status);
    }

    // Filter by method if provided
    if (method) {
      filteredPayments = filteredPayments.filter(payment => payment.method === method);
    }

    // Now apply pagination to the filtered results
    const totalCount = filteredPayments.length;
    const startIndex = parseInt(skip);
    const endIndex = startIndex + parseInt(count);
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    // Calculate pagination info
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
          currentPage: Math.floor(parseInt(skip) / parseInt(count)) + 1,
          totalPages: Math.ceil(totalCount / parseInt(count)),
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
      count: 100 // Get more records to ensure we have accurate stats
    };

    if (from) {
      options.from = Math.floor(new Date(from).getTime() / 1000);
    }
    if (to) {
      options.to = Math.floor(new Date(to).getTime() / 1000);
    }

    const payments = await razorpay.payments.all(options);
    
    // Calculate statistics based on actual items returned
    const stats = {
      total_payments: payments.items.length, // Use actual count of items returned
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
      console.log('This could be due to deleted records. Proceeding with refund using payment details from Razorpay...');
      
      // If no local transaction found, we can still process refund using Razorpay payment details
      // This handles cases where database records were deleted but payment exists in Razorpay
      const result = await RefundService.initiateRefundWithoutTransaction(
        paymentId,
        refundAmount,
        reason,
        refundedBy
      );

      res.status(200).json({
        success: true,
        message: 'Refund initiated successfully (no local transaction record found)',
        data: result
      });
      return;
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

// Process token refund (Admin/SuperAdmin only)
const processTokenRefund = async (req, res) => {
  try {
    const { tokenId, tokenType } = req.params; // tokenType: 'token' or 'booknow-token'
    const { paymentId, refundAmount, reason } = req.body;
    
    // Only admin/superadmin can process refunds
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process refunds'
      });
    }
    
    let token;
    if (tokenType === 'token') {
      token = await Token.findById(tokenId).populate('userid carid');
    } else if (tokenType === 'booknow-token') {
      token = await BookNowToken.findById(tokenId).populate('userid carid');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    // Check if token is in refund_initiated status
    if (token.status !== 'refund_initiated') {
      return res.status(400).json({
        success: false,
        message: 'Token is not in refund initiated status'
      });
    }
    
    // Use RefundService to process the refund
    const paymentIdToUse = paymentId || token.razorpayPaymentId;
    
    if (!paymentIdToUse) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required for refund processing'
      });
    }
    
    let refund;
    try {
      const refundResult = await RefundService.initiateRefund(
        paymentIdToUse,
        refundAmount ? refundAmount * 100 : null, // Convert to paise, null for full refund
        reason || 'Token refund',
        req.user.id.toString(),
        tokenType || 'token',
        token._id.toString()
      );
      
      refund = refundResult.razorpayRefund;
    } catch (refundError) {
      console.error('RefundService error:', refundError);
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund',
        error: refundError.message || 'Refund processing failed'
      });
    }
    
    // Update token status to refund_processed
    token.status = 'refund_processed';
    await token.save();
    
    // Send notifications to admins and superadmins
    try {
      const notificationType = tokenType === 'token' ? 'token_refund_processed' : 'booknow_token_refund_processed';
      const tokenName = tokenType === 'token' ? 'Token' : 'Book now token';
      
      await NotificationService.createAdminNotification(
        notificationType,
        `${tokenName} Refund Processed`,
        `${tokenName} ${token.customtokenid} refund has been processed successfully. Amount: ₹${refund.amount / 100}`,
        {
          tokenId: token._id,
          userId: token.userid._id,
          userName: token.userid.name,
          userEmail: token.userid.email,
          tokenCustomId: token.customtokenid,
          refundAmount: refund.amount / 100,
          refundId: refund.id,
          processedBy: req.user.name || req.user.email
        },
        token._id,
        tokenType === 'token' ? 'Token' : 'BookNowToken'
      );
      
      logger(`${tokenName} refund processed for token ${token._id} by ${req.user.role} ${req.user.id}`);
    } catch (notificationError) {
      logger(`Error creating notification for ${tokenType} refund processing: ${notificationError.message}`);
    }
    
    res.status(200).json({
      success: true,
      message: 'Token refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        tokenId: token._id,
        tokenStatus: token.status
      }
    });
  } catch (error) {
    logger(`Error in processTokenRefund: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to process token refund',
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
  refundPayment,
  processTokenRefund
};

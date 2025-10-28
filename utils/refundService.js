const razorpay = require('../config/razorpay');
const emailService = require('./emailService');
const notificationService = require('./notificationService');
const logger = require('./logger');

class RefundService {
  // Initiate refund for a payment
  static async initiateRefund(paymentId, refundAmount, reason, refundedBy, transactionType, transactionId) {
    try {
      console.log('RefundService.initiateRefund called with:', {
        paymentId,
        refundAmount,
        reason,
        refundedBy,
        transactionType,
        transactionId
      });

      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');
      const Token = require('../models/Token');
      const BookNowToken = require('../models/BookNowToken');
      const AMC = require('../models/AMC');
      const User = require('../models/User');

      // Get payment details from Razorpay
      console.log('Fetching payment from Razorpay:', paymentId);
      const payment = await razorpay.payments.fetch(paymentId);
      console.log('Razorpay payment response:', payment);
      
      // Debug: Check if we're in test mode
      const isTestMode = process.env.RAZOR_PAY_KEY_ID?.startsWith('rzp_test_');
      console.log('Razorpay configuration:', {
        keyId: process.env.RAZOR_PAY_KEY_ID,
        isTestMode: isTestMode,
        paymentAmount: payment.amount,
        paymentStatus: payment.status,
        paymentCreatedAt: new Date(payment.created_at * 1000).toISOString(),
        paymentEmail: payment.email,
        paymentContact: payment.contact
      });
      
      // Check if payment has test customer details but we're in production mode
      if (!isTestMode && (payment.email === 'user@example.com' || payment.contact === '9999999999')) {
        console.warn('WARNING: Payment has test customer details but Razorpay is in production mode');
        console.warn('This may cause refund issues. Payment details:', {
          email: payment.email,
          contact: payment.contact,
          method: payment.method
        });
      }
      
      // In test mode, sometimes we need to handle refunds differently
      if (isTestMode) {
        console.log('Running in test mode - checking for test mode limitations');
        
        // Check if payment was made with real bank VPA (common test mode limitation)
        if (payment.method === 'upi' && payment.vpa && !payment.vpa.includes('@razorpay')) {
          console.log('Payment made with real bank VPA in test mode - refunds may not be supported');
          throw new Error('Refund not supported: Payment was made with a real bank account in test mode. Refunds are only supported for test payments made with Razorpay test accounts.');
        }
      }
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'captured') {
        throw new Error(`Payment must be captured to initiate refund. Current status: ${payment.status}`);
      }

      // Check if payment has already been fully refunded
      if (payment.amount_refunded >= payment.amount) {
        console.log('Payment refund check:', {
          paymentId,
          amount: payment.amount,
          amount_refunded: payment.amount_refunded,
          isFullyRefunded: payment.amount_refunded >= payment.amount
        });
        throw new Error('Payment has already been fully refunded');
      }

      // Check if payment has partial refunds and we're trying to refund more than available
      const availableForRefund = payment.amount - payment.amount_refunded;
      if (availableForRefund <= 0) {
        throw new Error('No amount available for refund');
      }

      // Calculate refund amount (if not specified, refund available amount)
      const finalRefundAmount = refundAmount || availableForRefund;
      
      if (finalRefundAmount > availableForRefund) {
        throw new Error(`Refund amount cannot exceed available amount (₹${availableForRefund / 100})`);
      }

      // Ensure refund amount is at least 100 paise (₹1) as per Razorpay requirements
      if (finalRefundAmount < 100) {
        throw new Error('Refund amount must be at least ₹1 (100 paise)');
      }

      // Check if payment is older than 6 months (common refund limitation)
      const paymentDate = new Date(payment.created_at * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (paymentDate < sixMonthsAgo) {
        console.warn('Payment is older than 6 months. Refund may not be supported by the bank.');
      }

      // Create refund in Razorpay
      console.log('Creating Razorpay refund:', {
        paymentId,
        amount: finalRefundAmount,
        reason,
        refundedBy
      });
      
      let razorpayRefund;
      try {
        // Try with minimal parameters first
        const refundOptions = {
          amount: finalRefundAmount
        };
        
        // Only add notes if reason is provided
        if (reason && reason.trim()) {
          refundOptions.notes = {
            reason: reason.trim(),
            refunded_by: refundedBy
          };
        }
        
        console.log('Refund options being sent:', refundOptions);
        console.log('Payment ID type:', typeof paymentId);
        console.log('Amount type:', typeof finalRefundAmount);
        console.log('Amount value:', finalRefundAmount);
        
        // Try alternative API call format - sometimes the issue is with parameter structure
        try {
          // Method 1: Standard format
          razorpayRefund = await razorpay.payments.refund(paymentId, refundOptions);
        } catch (firstError) {
          console.log('First attempt failed, trying alternative format:', firstError.message);
          
          // Method 2: Try with just amount parameter
          razorpayRefund = await razorpay.payments.refund(paymentId, {
            amount: finalRefundAmount
          });
        }
        console.log('Razorpay refund created:', razorpayRefund);
      } catch (razorpayError) {
        console.error('Razorpay refund error:', razorpayError);
        
        // Provide more specific error messages based on common Razorpay errors
        if (razorpayError.error && razorpayError.error.code === 'BAD_REQUEST_ERROR') {
          if (razorpayError.error.description && razorpayError.error.description.includes('6 months')) {
            throw new Error('Refund not supported: Payment is older than 6 months. Only instant refunds may be supported.');
          } else if (razorpayError.error.description && razorpayError.error.description.includes('balance')) {
            throw new Error('Refund failed: Insufficient balance in Razorpay account. Please add funds to your account.');
          } else if (razorpayError.error.description && razorpayError.error.description.includes('amount')) {
            throw new Error('Refund failed: Invalid refund amount. Amount must be at least ₹1 and cannot exceed payment amount.');
          } else if (razorpayError.error.description === 'invalid request sent') {
            // Check if this is a test mode limitation with real bank VPA
            if (isTestMode && payment.method === 'upi' && payment.vpa && !payment.vpa.includes('@razorpay')) {
              throw new Error('Refund not supported: Payment was made with a real bank account in test mode. Refunds are only supported for test payments made with Razorpay test accounts.');
            } else {
              throw new Error('Refund failed: Invalid request sent to Razorpay. This may be due to payment method restrictions or account limitations.');
            }
          } else {
            throw new Error(`Refund failed: ${razorpayError.error.description || 'Invalid request sent to Razorpay'}`);
          }
        } else {
          throw new Error(`Razorpay refund error: ${razorpayError.message || 'Unknown error occurred'}`);
        }
      }

      // Get user details based on transaction type
      console.log('Looking up user for transaction:', { transactionType, transactionId });
      let userId;
      if (transactionType === 'amc') {
        const amc = await AMC.findById(transactionId);
        console.log('AMC found:', amc);
        userId = amc?.userid;
      } else if (transactionType === 'token') {
        const token = await Token.findById(transactionId);
        console.log('Token found:', token);
        userId = token?.userid;
      } else if (transactionType === 'booknowtoken') {
        const bookNowToken = await BookNowToken.findById(transactionId);
        console.log('BookNowToken found:', bookNowToken);
        userId = bookNowToken?.userid;
      }
      
      console.log('User ID found:', userId);
      
      if (!userId) {
        throw new Error('User not found for the given transaction');
      }
      
      const user = await User.findById(userId);
      console.log('User found:', user ? { id: user._id, name: user.name, email: user.email } : 'User not found');

      // Create refund record
      const refund = new Refund({
        originalPaymentId: paymentId,
        originalOrderId: payment.order_id,
        refundId: razorpayRefund.id,
        refundAmount: finalRefundAmount,
        refundStatus: 'initiated',
        userId: user._id,
        transactionType,
        transactionId,
        refundReason: reason,
        refundedBy,
        razorpayRefundId: razorpayRefund.id,
        razorpayRefundStatus: razorpayRefund.status,
        refundMethod: 'original'
      });

      await refund.save();

      // Update the original transaction record
      await this.updateTransactionRefundStatus(transactionType, transactionId, {
        refundId: razorpayRefund.id,
        refundAmount: finalRefundAmount,
        refundStatus: 'initiated',
        refundInitiatedAt: new Date(),
        refundReason: reason,
        refundedBy
      });

      // Send notification to user
      await this.sendRefundNotification(user, refund, 'initiated');

      // Send admin notification about refund initiation
      await this.sendAdminRefundNotification(refund, 'initiated', refundedBy);

      logger(`Refund initiated for payment ${paymentId}, refund ID: ${razorpayRefund.id}`);

      return {
        success: true,
        refund: refund,
        razorpayRefund: razorpayRefund
      };

    } catch (error) {
      console.error('Error in RefundService.initiateRefund:', error);
      logger(`Error initiating refund: ${error.message}`);
      throw error;
    }
  }

  // Process refund (called when Razorpay webhook confirms refund)
  static async processRefund(razorpayRefundId) {
    try {
      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');
      const User = require('../models/User');
      
      const refund = await Refund.findOne({ razorpayRefundId });
      
      if (!refund) {
        throw new Error('Refund record not found');
      }

      // Get updated refund status from Razorpay
      const razorpayRefund = await razorpay.payments.fetchRefund(razorpayRefundId);
      
      // Update refund status
      refund.refundStatus = razorpayRefund.status === 'processed' ? 'processed' : 'failed';
      refund.razorpayRefundStatus = razorpayRefund.status;
      refund.refundProcessedAt = new Date();

      if (razorpayRefund.status === 'processed') {
        refund.refundCompletedAt = new Date();
      }

      await refund.save();

      // Update transaction record
      await this.updateTransactionRefundStatus(refund.transactionType, refund.transactionId, {
        refundStatus: refund.refundStatus,
        refundProcessedAt: refund.refundProcessedAt,
        refundCompletedAt: refund.refundCompletedAt
      });

      // Get user details
      const user = await User.findById(refund.userId);
      
      // Send notification to user
      await this.sendRefundNotification(user, refund, refund.refundStatus);

      // Send admin notification about refund status update
      await this.sendAdminRefundNotification(refund, refund.refundStatus, refund.refundedBy);

      logger(`Refund processed: ${razorpayRefundId}, status: ${refund.refundStatus}`);

      return {
        success: true,
        refund: refund
      };

    } catch (error) {
      logger(`Error processing refund: ${error.message}`);
      throw error;
    }
  }

  // Update transaction refund status
  static async updateTransactionRefundStatus(transactionType, transactionId, refundData) {
    try {
      // Import models here to avoid circular dependencies
      const Token = require('../models/Token');
      const BookNowToken = require('../models/BookNowToken');
      const AMC = require('../models/AMC');
      
      let updateQuery = {};
      
      // Build update query based on transaction type
      if (transactionType === 'token') {
        updateQuery = {
          'refundDetails.refundId': refundData.refundId,
          'refundDetails.refundAmount': refundData.refundAmount,
          'refundDetails.refundStatus': refundData.refundStatus,
          'refundDetails.refundInitiatedAt': refundData.refundInitiatedAt,
          'refundDetails.refundProcessedAt': refundData.refundProcessedAt,
          'refundDetails.refundCompletedAt': refundData.refundCompletedAt,
          'refundDetails.refundReason': refundData.refundReason,
          'refundDetails.refundedBy': refundData.refundedBy
        };
        
        await Token.findByIdAndUpdate(transactionId, { refundDetails: updateQuery });
        
      } else if (transactionType === 'booknowtoken') {
        updateQuery = {
          'refundDetails.refundId': refundData.refundId,
          'refundDetails.refundAmount': refundData.refundAmount,
          'refundDetails.refundStatus': refundData.refundStatus,
          'refundDetails.refundInitiatedAt': refundData.refundInitiatedAt,
          'refundDetails.refundProcessedAt': refundData.refundProcessedAt,
          'refundDetails.refundCompletedAt': refundData.refundCompletedAt,
          'refundDetails.refundReason': refundData.refundReason,
          'refundDetails.refundedBy': refundData.refundedBy
        };
        
        await BookNowToken.findByIdAndUpdate(transactionId, { refundDetails: updateQuery });
        
      } else if (transactionType === 'amc') {
        // For AMC, we need to find the specific payment year and update it
        const amc = await AMC.findById(transactionId);
        if (amc) {
          // Find the paid AMC entry and update its refund details
          const paidAmcIndex = amc.amcamount.findIndex(amc => amc.paid === true);
          if (paidAmcIndex !== -1) {
            amc.amcamount[paidAmcIndex].refundDetails = {
              refundId: refundData.refundId,
              refundAmount: refundData.refundAmount,
              refundStatus: refundData.refundStatus,
              refundInitiatedAt: refundData.refundInitiatedAt,
              refundProcessedAt: refundData.refundProcessedAt,
              refundCompletedAt: refundData.refundCompletedAt,
              refundReason: refundData.refundReason,
              refundedBy: refundData.refundedBy
            };
            await amc.save();
          }
        }
      }

    } catch (error) {
      logger(`Error updating transaction refund status: ${error.message}`);
      throw error;
    }
  }

  // Send admin notification about refund events
  static async sendAdminRefundNotification(refund, status, refundedBy) {
    try {
      const statusMessages = {
        'initiated': 'A refund has been initiated',
        'processed': 'A refund has been processed',
        'successful': 'A refund has been completed successfully',
        'failed': 'A refund has failed',
        'cancelled': 'A refund has been cancelled'
      };

      const message = statusMessages[status] || 'A refund status has been updated.';
      const title = `Refund ${status.charAt(0).toUpperCase() + status.slice(1)}`;

      // Get refunded by user details
      let refundedByUser = null;
      if (refundedBy) {
        try {
          const User = require('../models/User');
          const Admin = require('../models/Admin');
          const SuperAdmin = require('../models/SuperAdmin');
          
          refundedByUser = await User.findById(refundedBy) || 
                          await Admin.findById(refundedBy) || 
                          await SuperAdmin.findById(refundedBy);
        } catch (error) {
          console.log('Error finding refunded by user:', error.message);
        }
      }

      const refundedByName = refundedByUser ? 
        (refundedByUser.name || refundedByUser.email) : 
        'Unknown User';

      // Send admin notification
      await notificationService.createAdminNotification(
        'refund_admin',
        title,
        `${message} for payment ${refund.originalPaymentId}. Amount: ₹${refund.refundAmount / 100}. Processed by: ${refundedByName}`,
        {
          refundId: refund.refundId,
          originalPaymentId: refund.originalPaymentId,
          refundAmount: refund.refundAmount,
          status: status,
          refundedBy: refundedBy,
          refundedByName: refundedByName,
          transactionType: refund.transactionType
        },
        refund._id,
        'Refund'
      );

    } catch (error) {
      logger(`Error sending admin refund notification: ${error.message}`);
      // Don't throw error here as it shouldn't break the refund process
    }
  }

  // Send refund notification to user
  static async sendRefundNotification(user, refund, status) {
    try {
      // If no user provided, skip notifications (for cases where local record was deleted)
      if (!user) {
        console.log('No user information available for refund notification - skipping notifications');
        return;
      }

      const statusMessages = {
        'initiated': 'Your refund has been initiated and is being processed.',
        'processed': 'Your refund has been processed and will be credited to your account within 5-7 business days.',
        'successful': 'Your refund has been successfully processed and credited to your account.',
        'failed': 'Your refund request failed. Please contact support for assistance.',
        'cancelled': 'Your refund request has been cancelled.'
      };

      const message = statusMessages[status] || 'Your refund status has been updated.';

      // Send email notification
      await emailService.sendRefundNotification(user.email, {
        userName: user.name,
        refundId: refund.refundId,
        refundAmount: refund.refundAmount / 100, // Convert from paise to rupees
        status: status,
        message: message,
        transactionType: refund.transactionType
      });

      // Send website notification
      await notificationService.createUserNotification(
        user._id,
        'refund',
        'Refund Update',
        message,
        {
          refundId: refund.refundId,
          refundAmount: refund.refundAmount,
          status: status
        },
        refund._id,
        'Refund'
      );

    } catch (error) {
      logger(`Error sending refund notification: ${error.message}`);
      // Don't throw error here as it shouldn't break the refund process
    }
  }

  // Get refund history for a user
  static async getUserRefunds(userId, page = 1, limit = 10) {
    try {
      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');
      
      const skip = (page - 1) * limit;
      
      const refunds = await Refund.find({ userId })
        .populate('refundedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Refund.countDocuments({ userId });

      return {
        refunds,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRefunds: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger(`Error getting user refunds: ${error.message}`);
      throw error;
    }
  }

  // Get all refunds (admin)
  static async getAllRefunds(page = 1, limit = 10, status = null) {
    try {
      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');
      
      const skip = (page - 1) * limit;
      const filter = status ? { refundStatus: status } : {};

      const refunds = await Refund.find(filter)
        .populate('userId', 'name email')
        .populate('refundedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Refund.countDocuments(filter);

      return {
        refunds,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRefunds: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger(`Error getting all refunds: ${error.message}`);
      throw error;
    }
  }

  // Initiate refund without local transaction record (for deleted records)
  static async initiateRefundWithoutTransaction(paymentId, refundAmount, reason, refundedBy) {
    try {
      console.log('RefundService.initiateRefundWithoutTransaction called with:', {
        paymentId,
        refundAmount,
        reason,
        refundedBy
      });

      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');

      // Get payment details from Razorpay
      console.log('Fetching payment from Razorpay:', paymentId);
      const payment = await razorpay.payments.fetch(paymentId);
      console.log('Razorpay payment response:', payment);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'captured') {
        throw new Error(`Payment must be captured to initiate refund. Current status: ${payment.status}`);
      }

      // Check if payment has already been fully refunded
      if (payment.amount_refunded >= payment.amount) {
        console.log('Payment refund check:', {
          paymentId,
          amount: payment.amount,
          amount_refunded: payment.amount_refunded,
          isFullyRefunded: payment.amount_refunded >= payment.amount
        });
        throw new Error('Payment has already been fully refunded');
      }

      // Check if payment has partial refunds and we're trying to refund more than available
      const availableForRefund = payment.amount - payment.amount_refunded;
      if (availableForRefund <= 0) {
        throw new Error('No amount available for refund');
      }

      // Calculate refund amount (if not specified, refund available amount)
      const finalRefundAmount = refundAmount || availableForRefund;
      
      if (finalRefundAmount > availableForRefund) {
        throw new Error(`Refund amount cannot exceed available amount (₹${availableForRefund / 100})`);
      }

      // Ensure refund amount is at least 100 paise (₹1) as per Razorpay requirements
      if (finalRefundAmount < 100) {
        throw new Error('Refund amount must be at least ₹1 (100 paise)');
      }

      // Check if payment is older than 6 months (common refund limitation)
      const paymentDate = new Date(payment.created_at * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (paymentDate < sixMonthsAgo) {
        console.warn('Payment is older than 6 months. Refund may not be supported by the bank.');
      }

      // Debug: Check if we're in test mode
      const isTestMode = process.env.RAZOR_PAY_KEY_ID?.startsWith('rzp_test_');
      console.log('Razorpay configuration:', {
        keyId: process.env.RAZOR_PAY_KEY_ID,
        isTestMode: isTestMode,
        paymentAmount: payment.amount,
        paymentStatus: payment.status,
        paymentCreatedAt: new Date(payment.created_at * 1000).toISOString(),
        paymentEmail: payment.email,
        paymentContact: payment.contact
      });
      
      // Check if payment has test customer details but we're in production mode
      if (!isTestMode && (payment.email === 'user@example.com' || payment.contact === '9999999999')) {
        console.warn('WARNING: Payment has test customer details but Razorpay is in production mode');
        console.warn('This may cause refund issues. Payment details:', {
          email: payment.email,
          contact: payment.contact,
          method: payment.method
        });
      }
      
      // In test mode, sometimes we need to handle refunds differently
      if (isTestMode) {
        console.log('Running in test mode - checking for test mode limitations');
        
        // Check if payment was made with real bank VPA (common test mode limitation)
        if (payment.method === 'upi' && payment.vpa && !payment.vpa.includes('@razorpay')) {
          console.log('Payment made with real bank VPA in test mode - refunds may not be supported');
          throw new Error('Refund not supported: Payment was made with a real bank account in test mode. Refunds are only supported for test payments made with Razorpay test accounts.');
        }
      }

      // Create refund in Razorpay
      console.log('Creating Razorpay refund:', {
        paymentId,
        amount: finalRefundAmount,
        reason,
        refundedBy
      });
      
      let razorpayRefund;
      try {
        // Try with minimal parameters first
        const refundOptions = {
          amount: finalRefundAmount
        };
        
        // Only add notes if reason is provided
        if (reason && reason.trim()) {
          refundOptions.notes = {
            reason: reason.trim(),
            refunded_by: refundedBy
          };
        }
        
        console.log('Refund options being sent:', refundOptions);
        console.log('Payment ID type:', typeof paymentId);
        console.log('Amount type:', typeof finalRefundAmount);
        console.log('Amount value:', finalRefundAmount);
        
        // Try alternative API call format - sometimes the issue is with parameter structure
        try {
          // Method 1: Standard format
          razorpayRefund = await razorpay.payments.refund(paymentId, refundOptions);
        } catch (firstError) {
          console.log('First attempt failed, trying alternative format:', firstError.message);
          
          // Method 2: Try with just amount parameter
          razorpayRefund = await razorpay.payments.refund(paymentId, {
            amount: finalRefundAmount
          });
        }
        console.log('Razorpay refund created:', razorpayRefund);
      } catch (razorpayError) {
        console.error('Razorpay refund error:', razorpayError);
        
        // Provide more specific error messages based on common Razorpay errors
        if (razorpayError.error && razorpayError.error.code === 'BAD_REQUEST_ERROR') {
          if (razorpayError.error.description && razorpayError.error.description.includes('6 months')) {
            throw new Error('Refund not supported: Payment is older than 6 months. Only instant refunds may be supported.');
          } else if (razorpayError.error.description && razorpayError.error.description.includes('balance')) {
            throw new Error('Refund failed: Insufficient balance in Razorpay account. Please add funds to your account.');
          } else if (razorpayError.error.description && razorpayError.error.description.includes('amount')) {
            throw new Error('Refund failed: Invalid refund amount. Amount must be at least ₹1 and cannot exceed payment amount.');
          } else if (razorpayError.error.description === 'invalid request sent') {
            // Check if this is a test mode limitation with real bank VPA
            if (isTestMode && payment.method === 'upi' && payment.vpa && !payment.vpa.includes('@razorpay')) {
              throw new Error('Refund not supported: Payment was made with a real bank account in test mode. Refunds are only supported for test payments made with Razorpay test accounts.');
            } else {
              throw new Error('Refund failed: Invalid request sent to Razorpay. This may be due to payment method restrictions or account limitations.');
            }
          } else {
            throw new Error(`Refund failed: ${razorpayError.error.description || 'Invalid request sent to Razorpay'}`);
          }
        } else {
          throw new Error(`Razorpay refund error: ${razorpayError.message || 'Unknown error occurred'}`);
        }
      }

      // Create refund record without user/transaction details (since we don't have local record)
      const refund = new Refund({
        originalPaymentId: paymentId,
        originalOrderId: payment.order_id,
        refundId: razorpayRefund.id,
        refundAmount: finalRefundAmount,
        refundStatus: 'initiated',
        userId: null, // No user ID since we don't have local record
        transactionType: 'unknown', // Unknown since we don't have local record
        transactionId: null, // No transaction ID since we don't have local record
        refundReason: reason,
        refundedBy,
        razorpayRefundId: razorpayRefund.id,
        razorpayRefundStatus: razorpayRefund.status,
        refundMethod: 'original',
        notes: 'Refund processed without local transaction record (record may have been deleted)'
      });

      await refund.save();

      // Try to find user from payment details for notifications
      let user = null;
      if (payment.email) {
        try {
          const User = require('../models/User');
          user = await User.findOne({ email: payment.email });
          if (user) {
            console.log('Found user for notifications:', user.email);
            // Send notification to user
            await this.sendRefundNotification(user, refund, 'initiated');
          } else {
            console.log('No user found with email:', payment.email);
          }
        } catch (error) {
          console.log('Error finding user for notifications:', error.message);
        }
      }

      // Send admin notification about refund initiation (even if no user found)
      await this.sendAdminRefundNotification(refund, 'initiated', refundedBy);

      logger(`Refund initiated for payment ${paymentId} without local transaction record, refund ID: ${razorpayRefund.id}`);

      return {
        success: true,
        refund: refund,
        razorpayRefund: razorpayRefund
      };

    } catch (error) {
      console.error('Error in RefundService.initiateRefundWithoutTransaction:', error);
      logger(`Error initiating refund without transaction: ${error.message}`);
      throw error;
    }
  }

  // Cancel refund (if not yet processed)
  static async cancelRefund(refundId, reason) {
    try {
      // Import models here to avoid circular dependencies
      const Refund = require('../models/Refund');
      const User = require('../models/User');
      
      const refund = await Refund.findById(refundId);
      
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (refund.refundStatus !== 'initiated') {
        throw new Error('Only initiated refunds can be cancelled');
      }

      // Update refund status
      refund.refundStatus = 'cancelled';
      refund.notes = reason;
      await refund.save();

      // Update transaction record
      await this.updateTransactionRefundStatus(refund.transactionType, refund.transactionId, {
        refundStatus: 'cancelled'
      });

      // Get user details
      const user = await User.findById(refund.userId);
      
      // Send notification to user
      await this.sendRefundNotification(user, refund, 'cancelled');

      // Send admin notification about refund cancellation
      await this.sendAdminRefundNotification(refund, 'cancelled', refundedBy);

      logger(`Refund cancelled: ${refundId}`);

      return {
        success: true,
        refund: refund
      };

    } catch (error) {
      logger(`Error cancelling refund: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RefundService;

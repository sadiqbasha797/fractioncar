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
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'captured') {
        throw new Error(`Payment must be captured to initiate refund. Current status: ${payment.status}`);
      }

      // Calculate refund amount (if not specified, refund full amount)
      const finalRefundAmount = refundAmount || payment.amount;
      
      if (finalRefundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      // Create refund in Razorpay
      console.log('Creating Razorpay refund:', {
        paymentId,
        amount: finalRefundAmount,
        reason,
        refundedBy
      });
      
      const razorpayRefund = await razorpay.payments.refund(paymentId, {
        amount: finalRefundAmount,
        notes: {
          reason: reason,
          refunded_by: refundedBy
        }
      });
      
      console.log('Razorpay refund created:', razorpayRefund);

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

  // Send refund notification to user
  static async sendRefundNotification(user, refund, status) {
    try {
      const statusMessages = {
        'initiated': 'Your refund has been initiated and is being processed.',
        'processed': 'Your refund has been processed and will be credited to your account within 5-7 business days.',
        'successful': 'Your refund has been successfully processed and credited to your account.',
        'failed': 'Your refund request failed. Please contact support for assistance.'
      };

      const message = statusMessages[status] || 'Your refund status has been updated.';

      // Send email notification
      await emailService.sendRefundNotification(user.email, {
        userName: user.name,
        refundId: refund.refundId,
        refundAmount: refund.refundAmount,
        status: status,
        message: message,
        transactionType: refund.transactionType
      });

      // Send website notification
      await notificationService.createNotification({
        userId: user._id,
        title: 'Refund Update',
        message: message,
        type: 'refund',
        data: {
          refundId: refund.refundId,
          refundAmount: refund.refundAmount,
          status: status
        }
      });

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

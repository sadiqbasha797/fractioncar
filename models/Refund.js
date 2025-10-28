const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  // Original payment details
  originalPaymentId: {
    type: String,
    required: true
  },
  originalOrderId: {
    type: String,
    required: true
  },
  
  // Refund details
  refundId: {
    type: String,
    required: true,
    unique: true
  },
  refundAmount: {
    type: Number,
    required: true
  },
  refundStatus: {
    type: String,
    enum: ['initiated', 'processed', 'successful', 'failed', 'cancelled'],
    default: 'initiated'
  },
  
  // User and transaction details
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionType: {
    type: String,
    enum: ['token', 'booknowtoken', 'amc'],
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Refund processing details
  refundReason: {
    type: String,
    required: true
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  },
  
  // Timestamps
  refundInitiatedAt: {
    type: Date,
    default: Date.now
  },
  refundProcessedAt: Date,
  refundCompletedAt: Date,
  
  // Razorpay refund details
  razorpayRefundId: String,
  razorpayRefundStatus: String,
  razorpayRefundNotes: String,
  
  // Additional details
  notes: String,
  refundMethod: {
    type: String,
    enum: ['original', 'bank_transfer', 'wallet'],
    default: 'original'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
RefundSchema.index({ refundStatus: 1 });
RefundSchema.index({ userId: 1 });
RefundSchema.index({ transactionType: 1 });
RefundSchema.index({ refundedBy: 1 });
RefundSchema.index({ createdAt: 1 });
RefundSchema.index({ refundId: 1 });

// Check if model already exists to prevent OverwriteModelError
const Refund = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);

module.exports = Refund;

const mongoose = require('mongoose');

const AMCSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  carid: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  ticketid: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  amcamount: [{
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    duedate: { type: Date },
    paiddate: { type: Date },
    penality: { type: Number, default: 0 },
    lastPenaltyCalculation: { type: Date },
    // Payment transaction details for each AMC payment
    paymentTransactionId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    // Refund details for each AMC payment
    refundDetails: {
      refundId: String,
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: ['none', 'initiated', 'processed', 'successful', 'failed'],
        default: 'none'
      },
      refundInitiatedAt: Date,
      refundProcessedAt: Date,
      refundCompletedAt: Date,
      refundReason: String,
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin'
      }
    }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
AMCSchema.index({ createdAt: 1 });
AMCSchema.index({ carid: 1 });
AMCSchema.index({ userid: 1 });

// Check if model already exists to prevent OverwriteModelError
const AMC = mongoose.models.AMC || mongoose.model('AMC', AMCSchema);

module.exports = AMC;
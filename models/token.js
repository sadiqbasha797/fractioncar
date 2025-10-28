const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    carid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true
    },
    customtokenid: {
        type: String,
        required: true,
        unique: true
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amountpaid: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    expirydate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'dropped', 'refund_requested', 'refund_initiated', 'refund_processed'],
        default: 'active'
    },
    // Payment transaction details
    paymentTransactionId: {
        type: String,
        required: false
    },
    razorpayOrderId: {
        type: String,
        required: false
    },
    razorpayPaymentId: {
        type: String,
        required: false
    },
    // Refund details
    refundDetails: {
        type: {
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
        },
        default: {}
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
tokenSchema.index({ status: 1 });
tokenSchema.index({ createdAt: 1 });
tokenSchema.index({ carid: 1 });
tokenSchema.index({ userid: 1 });
tokenSchema.index({ status: 1, createdAt: 1 });

// Check if model already exists to prevent OverwriteModelError
const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

module.exports = Token;
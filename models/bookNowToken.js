const mongoose = require('mongoose');

const bookNowTokenSchema = new mongoose.Schema({
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
        enum: ['active', 'expired', 'dropped'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
bookNowTokenSchema.index({ status: 1 });
bookNowTokenSchema.index({ createdAt: 1 });
bookNowTokenSchema.index({ carid: 1 });
bookNowTokenSchema.index({ userid: 1 });
bookNowTokenSchema.index({ status: 1, createdAt: 1 });

const BookNowToken = mongoose.model('BookNowToken', bookNowTokenSchema);

module.exports = BookNowToken;
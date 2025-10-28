const mongoose = require('mongoose');

const carViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  // Track if user has made any purchase for this car
  hasPurchased: {
    type: Boolean,
    default: false
  },
  // Track purchase types
  purchaseTypes: {
    token: { type: Boolean, default: false },
    bookNowToken: { type: Boolean, default: false },
    ticket: { type: Boolean, default: false },
    booking: { type: Boolean, default: false }
  },
  // Track notification status
  notificationsSent: {
    type: Number,
    default: 0
  },
  lastNotificationSent: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
carViewSchema.index({ userId: 1, carId: 1, viewedAt: -1 });
carViewSchema.index({ userId: 1, hasPurchased: 1, viewedAt: -1 });
carViewSchema.index({ viewedAt: -1 });
carViewSchema.index({ hasPurchased: 1, viewedAt: -1 });

// Ensure one view record per user per car per day
carViewSchema.index({ userId: 1, carId: 1, viewedAt: 1 }, { unique: true });

module.exports = mongoose.model('CarView', carViewSchema);

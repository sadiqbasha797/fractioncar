const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Recipient information
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin', 'SuperAdmin']
  },
  
  // Notification content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'welcome',
      'booknow_token_created',
      'token_created',
      'ticket_created',
      'amc_payment_done',
      'amc_reminder',
      'booking_done',
      'kyc_approved',
      'kyc_rejected',
      'user_joined_waitlist',
      'user_purchased_token',
      'user_purchased_booknow_token',
      'user_created_ticket',
      'user_paid_amc',
      'user_made_booking',
      'user_kyc_approved',
      'user_kyc_rejected',
      'manual_announcement',
      'system_maintenance',
      'security_alert'
    ]
  },
  
  // Related entities (optional)
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityModel'
  },
  relatedEntityModel: {
    type: String,
    enum: ['Token', 'BookNowToken', 'Ticket', 'AMC', 'Booking', 'User', 'Car']
  },
  
  // Additional data for context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Expiry date for notifications
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ recipientId: 1, recipientModel: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  dateofbirth: { type: Date },
  address: { type: String },
  location: { type: String },
  pincode: { type: String },
  verified: { type: Boolean, default: false },
  logintoken: { type: String },
  passwordtoken: { type: String },
  tokensExpiry: { type: Date },
  profileimage: { type: String },
  // Government ID numbers/text values (not image URLs)
  governmentid: {
    aadharid: { type: String },
    panid: { type: String },
    licenseid: { type: String },
    income : { type: String }
  },
  kycStatus: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'], default: 'pending' },
  kycDocs: [{ type: String }],
  rejected_comments: [{
    comment: { type: String },
    date: { type: Date, default: Date.now }
  }],
  kycApprovedBy: {
    id: { type: mongoose.Schema.Types.ObjectId },
    role: { type: String },
    name: { type: String },
    email: { type: String }
  },
  // User status management
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'deactivated'], 
    default: 'active' 
  },
  suspensionEndDate: { type: Date },
  suspensionReason: { type: String },
  deactivationReason: { type: String },
  statusChangedBy: {
    id: { type: mongoose.Schema.Types.ObjectId },
    role: { type: String },
    name: { type: String },
    email: { type: String }
  },
  statusChangedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  // Email notification preferences
  emailNotifications: {
    enabled: { type: Boolean, default: true },
    tokenPurchase: { type: Boolean, default: true },
    bookNowToken: { type: Boolean, default: true },
    amcPayment: { type: Boolean, default: true },
    booking: { type: Boolean, default: true },
    kyc: { type: Boolean, default: true },
    refund: { type: Boolean, default: true },
    sharedMember: { type: Boolean, default: true }
  }
});

// Add indexes for better query performance
UserSchema.index({ isVerified: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ suspensionEndDate: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ isVerified: 1, createdAt: 1 });
UserSchema.index({ kycStatus: 1, createdAt: 1 });
UserSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('User', UserSchema);
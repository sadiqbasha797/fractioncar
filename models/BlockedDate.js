const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema({
  carid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  blockedFrom: {
    type: Date,
    required: true
  },
  blockedTo: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    default: 'Maintenance'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true
  },
  createdByModel: {
    type: String,
    enum: ['Admin', 'SuperAdmin'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
blockedDateSchema.index({ carid: 1 });
blockedDateSchema.index({ blockedFrom: 1, blockedTo: 1 });
blockedDateSchema.index({ isActive: 1 });
blockedDateSchema.index({ carid: 1, isActive: 1 });

module.exports = mongoose.model('BlockedDate', blockedDateSchema);

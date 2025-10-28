const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  carid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingFrom: {
    type: Date,
    required: true
  },
  bookingTo: {
    type: Date,
    required: true
  },
  comments: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['accepted', 'rejected'],
    default: 'accepted'
  },
  acceptedby: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'acceptedByModel'
  },
  acceptedByModel: {
    type: String,
    enum: ['Admin', 'SuperAdmin']
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: 1 });
bookingSchema.index({ carid: 1 });
bookingSchema.index({ userid: 1 });
bookingSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
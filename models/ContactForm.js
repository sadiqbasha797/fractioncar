const mongoose = require('mongoose');

const ContactFormSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  subject: { 
    type: String, 
    required: true,
    trim: true
  },
  message: { 
    type: String, 
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['new', 'read', 'replied', 'closed'], 
    default: 'new' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  adminNotes: [{
    note: { type: String },
    addedBy: { 
      id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String },
      role: { type: String }
    },
    addedAt: { type: Date, default: Date.now }
  }],
  repliedBy: {
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String },
    role: { type: String }
  },
  repliedAt: { type: Date },
  closedBy: {
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String },
    role: { type: String }
  },
  closedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
ContactFormSchema.index({ status: 1 });
ContactFormSchema.index({ priority: 1 });
ContactFormSchema.index({ createdAt: 1 });
ContactFormSchema.index({ status: 1, createdAt: 1 });

// Update the updatedAt field before saving
ContactFormSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ContactForm', ContactFormSchema);
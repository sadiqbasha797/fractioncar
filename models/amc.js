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
    penality: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
AMCSchema.index({ createdAt: 1 });
AMCSchema.index({ carid: 1 });
AMCSchema.index({ userid: 1 });

module.exports = mongoose.model('AMC', AMCSchema);
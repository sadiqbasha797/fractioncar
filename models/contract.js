const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
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
    ticketid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    contract_docs: {
        type: [String], // Array of document paths or URLs
    },
    createdby: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'createdByModel'
    },
    createdByModel: {
        type: String,
        required: true,
        enum: ['Admin', 'SuperAdmin']
    },
    createdat: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
contractSchema.index({ createdAt: 1 });
contractSchema.index({ carid: 1 });
contractSchema.index({ userid: 1 });

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
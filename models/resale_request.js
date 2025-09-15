const mongoose = require('mongoose');

const resaleRequestSchema = new mongoose.Schema({
    ticketid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    comments: {
        type: String
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    carid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true
    },
    requestdate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected'],
        required: true
    },
    resaleamount: {
        type: Number,
        required: true
    },
    rejectedreason: {
        type: String
    },
    paymentstatus: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    paiddate: {
        type: Date
    },
    updatedby: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'superadmin'],
            required: true
        }
    }
}, {
    timestamps: true
});

const ResaleRequest = mongoose.model('ResaleRequest', resaleRequestSchema);

module.exports = ResaleRequest;
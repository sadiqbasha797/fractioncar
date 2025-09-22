const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    carid: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    ticketcustomid: { type: String, required: true },
    ticketprice: { type: Number, required: true },
    pricepaid: { type: Number, required: true },
    pendingamount: { type: Number, required: true },
    ticketexpiry: { type: Date, required: false },
    ticketbroughtdate: { type: Date, required: true },
    comments: { type: String },
    paymentid: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    ticketstatus: { type: String, enum: ['active', 'expired', 'cancelled'],  default: 'active' },
    resold: { type: Boolean, default: false },
    createdby: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'createdByModel' },
    createdByModel: { type: String, required: true, enum: ['Admin', 'SuperAdmin'] },
    sharedMembers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'SharedMember' 
    }],
    createdate: { type: Date, default: Date.now }
});

// Add indexes for better query performance
TicketSchema.index({ ticketstatus: 1 });
TicketSchema.index({ createdAt: 1 });
TicketSchema.index({ carid: 1 });
TicketSchema.index({ userid: 1 });
TicketSchema.index({ ticketstatus: 1, createdAt: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
const mongoose = require('mongoose');

const SharedMemberSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    mobileNumber: { 
        type: String, 
        required: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
    },
    aadharNumber: { 
        type: String, 
        required: true,
        trim: true,
        match: [/^\d{12}$/, 'Please enter a valid 12-digit Aadhar number']
    },
    panNumber: { 
        type: String, 
        required: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
    },
    kycDocuments: [{
        documentType: {
            type: String,
            enum: ['aadhar_front', 'aadhar_back', 'pan_card', 'passport', 'driving_license', 'other'],
            required: true
        },
        documentUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending'
    },
    rejectedComments: { 
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'createdByModel'
    },
    createdByModel: {
        type: String,
        required: true,
        enum: ['User', 'Admin', 'SuperAdmin']
    },
    ticketid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: false
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

// Add indexes for better query performance
SharedMemberSchema.index({ email: 1 });
SharedMemberSchema.index({ mobileNumber: 1 });
SharedMemberSchema.index({ aadharNumber: 1 });
SharedMemberSchema.index({ panNumber: 1 });
SharedMemberSchema.index({ status: 1 });
SharedMemberSchema.index({ createdBy: 1 });
SharedMemberSchema.index({ created_at: 1 });

module.exports = mongoose.model('SharedMember', SharedMemberSchema);

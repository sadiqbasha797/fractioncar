const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    carname: {
        type: String,
        required: false
    },
    color: {
        type: String,
        required: false
    },
    milege: {
        type: String,
        required: false
    },
    seating: {
        type: Number,
        required: false
    },
    features: {
        type: [String],
        required: false
    },
    brandname: {
        type: String,
        required: false
    },
    price: {
        type: String,
        required: false
    },
    fractionprice: {
        type: String,
        required: false
    },
    tokenprice: {
        type: String,
        required: false
    },
    amcperticket: {
        type: String,
        required: false
    },
    contractYears: {
        type: Number,
        required: false,
        default: 5
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'cancelled'],
        default: 'pending'
    },
    ticketsavilble: {
        type: Number,
        required: false
    },
    totaltickets: {
        type: Number,
        required: false,
        default: 12
      },
      bookNowTokenAvailable: {
        type: Number,
        required: false,
        default: 12
      },
      bookNowTokenPrice: {
        type: String,
        required: false
      },
      tokensavailble: {
        type: Number,
        required: false
      },
      images: {
        type: [String],
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        refPath: 'createdByModel'
    },
    createdByModel: {
        type: String,
        required: false,
        enum: ['Admin', 'SuperAdmin']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        required: false
    },
    pincode: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    }
});

// Add indexes for better query performance
carSchema.index({ status: 1 });
carSchema.index({ brandname: 1 });
carSchema.index({ createdAt: 1 });
carSchema.index({ status: 1, createdAt: 1 });

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
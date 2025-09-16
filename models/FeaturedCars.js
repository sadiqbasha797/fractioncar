const mongoose = require('mongoose');

const featuredCarsSchema = new mongoose.Schema({
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
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
    }
});

// Add indexes for better query performance
featuredCarsSchema.index({ carId: 1 });
featuredCarsSchema.index({ createdAt: 1 });

const FeaturedCars = mongoose.model('FeaturedCars', featuredCarsSchema);

module.exports = FeaturedCars;

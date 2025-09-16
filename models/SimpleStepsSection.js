const mongoose = require('mongoose');

const simpleStepsSectionSchema = new mongoose.Schema({
    sectionTitle: {
        type: String,
        default: "Simple Steps"
    },
    sectionDescription: {
        type: String
    },
    video: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
simpleStepsSectionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const SimpleStepsSection = mongoose.model('SimpleStepsSection', simpleStepsSectionSchema);

module.exports = SimpleStepsSection;

const mongoose = require('mongoose');

const simpleStepsSchema = new mongoose.Schema({
    stepTitle: {
        type: String
    },
    stepName: {
        type: String
    },
    // Removed video1 and video2 fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const SimpleSteps = mongoose.model('SimpleSteps', simpleStepsSchema);

module.exports = SimpleSteps;
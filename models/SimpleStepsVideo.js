const mongoose = require('mongoose');

const simpleStepsVideoSchema = new mongoose.Schema({
    video1: {
        type: String
    },
    video2: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const SimpleStepsVideo = mongoose.model('SimpleStepsVideo', simpleStepsVideoSchema);

module.exports = SimpleStepsVideo;
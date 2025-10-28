const mongoose = require('mongoose');

const heroContentSchema = new mongoose.Schema({
    bgImage1: {
        type: String
    },
    bgImage2: {
        type: String
    },
    bgImage3: {
        type: String
    },
    heroText: {
        type: String
    },
    subText: {
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

const HeroContent = mongoose.model('HeroContent', heroContentSchema);

module.exports = HeroContent;

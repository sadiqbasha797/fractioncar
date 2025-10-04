const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
    aboutheroimage: {
        type: String
    },
    aboutherotext: {
        type: String
    },
    aboutherosubtext: {
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

const About = mongoose.model('About', aboutSchema);

module.exports = About;

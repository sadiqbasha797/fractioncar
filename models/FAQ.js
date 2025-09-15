const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: {
        type: String
    },
    category: {
        type: String,
        enum: ['Understanding', 'Pricing', 'Car Delivery', 'Car Usage Policy']
    },
    answer: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;
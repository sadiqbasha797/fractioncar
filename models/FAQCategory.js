const mongoose = require('mongoose');

const faqCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
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
faqCategorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const FAQCategory = mongoose.model('FAQCategory', faqCategorySchema);

module.exports = FAQCategory;

const mongoose = require('mongoose');

const brandsSchema = new mongoose.Schema({
    brandName: {
        type: String
    },
    brandLogo: {
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

const Brands = mongoose.model('Brands', brandsSchema);

module.exports = Brands;

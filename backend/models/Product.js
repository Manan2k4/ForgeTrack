// ForgeTrack/backend/models/Product.js
const mongoose = require('mongoose');

// Schema for different part sizes (e.g., "STD", "1", "2" or "2-125")
const partSizeSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true,
        trim: true,
        unique: true // Ensure size is unique under a given code/name
    }
});

// Main Product Schema
const ProductSchema = new mongoose.Schema({
    // Type of product (Sleeve, Rod, Pin)
    type: {
        type: String,
        enum: ['Sleeve', 'Rod', 'Pin'],
        required: true
    },
    // The identifier (code for Sleeves, name for Rods/Pins)
    identifier: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // The sizes available for this product
    sizes: [partSizeSchema],
    // Timestamp of when the product was added
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);

// ForgeTrack/backend/routes/productRoutes.js
const express = require('express');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/products
// @desc    Add a new product with sizes (Admin only)
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { type, identifier, sizes } = req.body;

    // Check if a product with this identifier already exists
    const productExists = await Product.findOne({ identifier });
    if (productExists) {
        res.status(400);
        throw new Error('A product with this identifier already exists.');
    }

    const newProduct = await Product.create({
        type,
        identifier,
        sizes: sizes.map(size => ({ size }))
    });

    res.status(201).json({
        message: 'Product added successfully!',
        product: newProduct
    });
}));

// @route   GET /api/products
// @desc    Get all products (Admin only)
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const products = await Product.find({});
    res.json(products);
}));

module.exports = router;

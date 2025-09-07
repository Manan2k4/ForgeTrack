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

// @route   PUT /api/products/:id
// @desc    Update a product (Admin only)
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { type, identifier, sizes } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
        // Check if another product has the same identifier (exclude current product)
        const existingProduct = await Product.findOne({ 
            identifier, 
            _id: { $ne: req.params.id } 
        });
        if (existingProduct) {
            res.status(400);
            throw new Error('A product with this identifier already exists.');
        }

        product.type = type || product.type;
        product.identifier = identifier || product.identifier;
        product.sizes = sizes ? sizes.map(size => ({ size })) : product.sizes;

        const updatedProduct = await product.save();
        res.json({
            message: 'Product updated successfully!',
            product: updatedProduct
        });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
}));

// @route   DELETE /api/products/:id
// @desc    Delete a product (Admin only)
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed successfully' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
}));

// @route   GET /api/products/for-workers
// @desc    Get products formatted for worker job forms
// @access  Private (Worker only)
router.get('/for-workers', protect, authorize('worker'), asyncHandler(async (req, res) => {
    const products = await Product.find({});
    
    // Format products for worker forms
    const formattedProducts = {
        sleeves: products.filter(p => p.type === 'Sleeve').map(p => ({
            code: p.identifier,
            sizes: p.sizes.map(s => s.size)
        })),
        rods: products.filter(p => p.type === 'Rod').map(p => ({
            partName: p.identifier,
            sizes: p.sizes.map(s => s.size)
        })),
        pins: products.filter(p => p.type === 'Pin').map(p => ({
            partName: p.identifier,
            sizes: p.sizes.map(s => s.size)
        }))
    };
    
    res.json(formattedProducts);
}));

module.exports = router;

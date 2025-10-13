const express = require('express');
const Product = require('../models/Product');
const { adminAuth, auth } = require('../middleware/auth');
const router = express.Router();

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /products] query.type =', type);
    }
    const filter = type ? { type } : {};
    
    const products = await Product.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Create new product (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { type, code, partName, sizes } = req.body;
    const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : type;
    const normalizedCode = typeof code === 'string' ? code.trim() : code;
    const normalizedPartName = typeof partName === 'string' ? partName.trim() : partName;
    const sizesArray = Array.isArray(sizes)
      ? sizes.map((s) => (s != null ? String(s).trim() : '')).filter(Boolean)
      : [];
    const uniqueSizes = Array.from(new Set(sizesArray));

    // Validation
    if (!normalizedType || uniqueSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product type and sizes array are required'
      });
    }

    if (normalizedType === 'sleeve' && !normalizedCode) {
      return res.status(400).json({
        success: false,
        message: 'Code is required for sleeve products'
      });
    }

    if ((normalizedType === 'rod' || normalizedType === 'pin') && !normalizedPartName) {
      return res.status(400).json({
        success: false,
        message: 'Part name is required for rod and pin products'
      });
    }

    // Check for duplicate
    let duplicate;
    if (normalizedType === 'sleeve') {
      duplicate = await Product.findOne({ type: 'sleeve', code: normalizedCode });
    } else {
      duplicate = await Product.findOne({ type: normalizedType, partName: normalizedPartName })
        .collation({ locale: 'en', strength: 2 });
    }

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists'
      });
    }

    // Create new product
    const productData = {
      type: normalizedType,
      sizes: uniqueSizes
    };

    if (normalizedType === 'sleeve') {
      productData.code = normalizedCode;
    } else {
      productData.partName = normalizedPartName;
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Update product (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const productId = req.params.id;
    const { sizes } = req.body;

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sizes array is required'
      });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { sizes: sizes.filter(size => size && size.trim()) },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Delete product (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

module.exports = router;
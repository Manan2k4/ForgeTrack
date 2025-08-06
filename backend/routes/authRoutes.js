// ForgeTrack/backend/routes/authRoutes.js
const express = require('express');
const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper function to generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @route   POST /api/auth/login
// @desc    Authenticate employee & get token (for all roles)
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find employee by username
    const employee = await Employee.findOne({ username });

    // Check if employee exists and password matches
    if (employee && (await employee.matchPassword(password))) {
        // If employee is inactive, deny login
        if (!employee.isActive) {
            res.status(401); // Unauthorized
            throw new Error('Account is disabled. Please contact your administrator.');
        }

        // Send back employee details and token
        res.json({
            _id: employee._id,
            username: employee.username,
            displayName: employee.displayName,
            role: employee.role,
            isActive: employee.isActive,
            token: generateToken(employee._id, employee.role),
        });
    } else {
        res.status(401); // Unauthorized
        throw new Error('Invalid username or password');
    }
}));

module.exports = router;

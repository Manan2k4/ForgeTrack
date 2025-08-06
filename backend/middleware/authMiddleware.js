// ForgeTrack/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // Simple wrapper for async middleware
const Employee = require('../models/Employee');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user (without password) to the request object
            req.user = await Employee.findById(decoded.id).select('-password');
            next(); // Proceed to the next middleware/route handler
        } catch (error) {
            console.error('Not authorized, token failed:', error.message);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    // If no token is found
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// Authorize roles - check if the user has the required role(s)
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if the user's role is included in the allowed roles
        if (!roles.includes(req.user.role)) {
            res.status(403); // Forbidden
            throw new Error(`User role ${req.user.role} is not authorized to access this route`);
        }
        next(); // User is authorized, proceed
    };
};

module.exports = { protect, authorize };

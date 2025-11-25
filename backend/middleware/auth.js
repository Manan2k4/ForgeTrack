const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth middleware - Authorization header:', authHeader);
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded:', decoded);
    
    // Check if the ID is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      console.log('Auth middleware - Invalid ObjectId format:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format.' 
      });
    }
    
    const user = await User.findById(decoded.id);
    console.log('Auth middleware - User lookup result:', user);
    if (user) {
      console.log('Auth middleware - User found:', user.name, user.department, user.role);
    }

    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    // Prevent deactivated employees from accessing APIs
    if (user.role === 'employee' && user.isActive === false) {
      console.log('Auth middleware - User is deactivated');
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('Auth middleware - Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error.' 
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. Admin privileges required.' 
        });
      }
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { auth, adminAuth };
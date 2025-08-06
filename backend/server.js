// ForgeTrack/backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Node.js built-in module for path manipulation

// Load environment variables from .env file
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const workerLogRoutes = require('./routes/workerLogRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected to ForgeTrackDB!');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

connectDB();

// Middleware
app.use(express.json()); // Body parser for JSON data
app.use(cors()); // Enable CORS for all origins (for development)

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes); // Employee CRUD operations (admin only)
app.use('/api/worker-logs', workerLogRoutes); // Worker log operations (worker create, admin view)

// Serve static assets in production (if you build React app into backend)
// For this setup, we assume frontend is served by Firebase Hosting,
// so this part is mostly for future reference or if you decide to serve frontend from Node.js.
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../admin-panel/dist')));

    app.get('*', (req, res) =>
        res.sendFile(path.resolve(__dirname, '../admin-panel', 'dist', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('ForgeTrack Backend API is running in development mode!');
    });
}

// Error handling middleware (optional, but good for structured errors)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(res.statusCode || 500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});


// Define the port
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

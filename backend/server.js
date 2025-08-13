// ForgeTrack/backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const workerLogRoutes = require('./routes/workerLogRoutes');
const productRoutes = require('./routes/productRoutes'); // <-- NEW: Import product routes

const app = express();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected to ForgeTrackDB!');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

connectDB();

app.use(express.json());
app.use(cors());

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/worker-logs', workerLogRoutes);
app.use('/api/products', productRoutes); // <-- NEW: Use product routes

// Serve static assets (as before)
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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(res.statusCode || 500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

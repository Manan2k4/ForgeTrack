// ForgeTrack/backend/models/WorkerLog.js
const mongoose = require('mongoose');

const WorkerLogSchema = new mongoose.Schema({
    // Reference to the worker (Employee) who created this log
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee', // Refers to the Employee model
        required: true
    },
    // Name or ID of the product worked on
    product: {
        type: String,
        required: true,
        trim: true
    },
    // Quantity of the product completed
    quantity: {
        type: Number,
        required: true,
        min: 0 // Quantity cannot be negative
    },
    // Timestamp of when the log was created
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    // Add timestamps for createdAt and updatedAt automatically
    timestamps: true
});

module.exports = mongoose.model('WorkerLog', WorkerLogSchema);

// ForgeTrack/backend/models/WorkerLog.js
const mongoose = require('mongoose');

const WorkerLogSchema = new mongoose.Schema({
    // Reference to the worker (Employee) who created this log
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee', // Refers to the Employee model
        required: true
    },
    // Job type (Inside Job Rod, Inside Job Sleeve, Inside Job Pin)
    jobType: {
        type: String,
        enum: ['Inside Job Rod', 'Inside Job Sleeve', 'Inside Job Pin'],
        required: true
    },
    // Product details based on job type
    productDetails: {
        // For Sleeve: code and size
        code: {
            type: String,
            required: function() { return this.jobType === 'Inside Job Sleeve'; }
        },
        // For Rod/Pin: part name and size
        partName: {
            type: String,
            required: function() { return this.jobType === 'Inside Job Rod' || this.jobType === 'Inside Job Pin'; }
        },
        // Size for all types
        size: {
            type: String,
            required: true
        }
    },
    // Quantity of parts worked on
    quantity: {
        type: Number,
        required: true,
        min: 0 // Quantity cannot be negative
    },
    // Date of work (separate from timestamp for filtering)
    workDate: {
        type: Date,
        default: Date.now
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

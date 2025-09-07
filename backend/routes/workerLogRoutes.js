// ForgeTrack/backend/routes/workerLogRoutes.js
const express = require('express');
const asyncHandler = require('express-async-handler');
const WorkerLog = require('../models/WorkerLog');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/worker-logs
// @desc    Get all worker logs (for admin panel)
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    // Admins can view all worker logs
    // You can add query parameters for filtering (e.g., by worker, date range) here
    const logs = await WorkerLog.find({})
        .populate('worker', 'username displayName')
        .sort({ workDate: -1, timestamp: -1 }); // Sort by work date, then timestamp
    res.json(logs);
}));

// @route   POST /api/worker-logs
// @desc    Create a new worker log (by a worker)
// @access  Private (Worker only)
router.post('/', protect, authorize('worker'), asyncHandler(async (req, res) => {
    const { jobType, productDetails, quantity, workDate } = req.body;

    // Ensure the logged-in user is the worker creating the log
    const workerLog = await WorkerLog.create({
        worker: req.user._id, // The ID of the authenticated worker
        jobType,
        productDetails,
        quantity,
        workDate: workDate || new Date()
    });

    if (workerLog) {
        res.status(201).json({
            message: 'Worker log created successfully',
            log: workerLog
        });
    } else {
        res.status(400);
        throw new Error('Invalid worker log data');
    }
}));

module.exports = router;

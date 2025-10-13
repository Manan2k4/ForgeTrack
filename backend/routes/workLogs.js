const express = require('express');
const WorkLog = require('../models/WorkLog');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get work logs (admin gets all, employees get their own)
router.get('/', auth, async (req, res) => {
  try {
    const { date, employee, jobType } = req.query;
    let filter = {};

    // If user is employee, only show their logs
    if (req.user.role === 'employee') {
      filter.employee = req.user._id;
    }

    // Apply additional filters
    if (date) filter.workDate = date;
    if (employee && req.user.role === 'admin') filter.employee = employee;
    if (jobType) filter.jobType = jobType;

    const workLogs = await WorkLog.find(filter)
      .populate('employee', 'name username department isActive')
      .populate('product', 'type code partName')
      .sort({ createdAt: -1 });

    // Format the data for frontend compatibility
    const formattedLogs = workLogs.map(log => ({
      id: log._id,
      employeeId: log.employee?._id || undefined,
      employeeName: (log.employee && log.employee.name) || log.employeeName || 'Former Employee',
      jobType: log.jobType,
      code: log.product?.code,
      partName: log.product?.partName,
      partSize: log.partSize,
      operation: log.operation,
      totalParts: typeof log.totalParts === 'number' ? log.totalParts : (typeof log.quantity === 'number' ? log.quantity : 0),
      rejection: typeof log.rejection === 'number' ? log.rejection : 0,
      date: log.workDate,
      timestamp: log.createdAt
    }));

    res.json({
      success: true,
      data: formattedLogs
    });
  } catch (error) {
    console.error('Get work logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work logs',
      error: error.message
    });
  }
});

// Create new work log
router.post('/', auth, async (req, res) => {
  try {
  const { productId, partSize, operation } = req.body;
  // Support new fields with backward compatibility
  const totalParts = typeof req.body.totalParts === 'number' ? req.body.totalParts : (typeof req.body.quantity === 'number' ? req.body.quantity : undefined);
  const rejection = typeof req.body.rejection === 'number' ? req.body.rejection : 0;

    // Validation
    if (!productId || !partSize || typeof totalParts === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Product, part size, and total parts are required'
      });
    }

    if (totalParts < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total parts must be at least 1'
      });
    }

    if (rejection < 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection cannot be negative'
      });
    }

    if (rejection > totalParts) {
      return res.status(400).json({
        success: false,
        message: 'Rejection cannot exceed total parts'
      });
    }

    // Get product to determine job type
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify that the part size exists for this product
    if (!product.sizes.includes(partSize)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid part size for this product'
      });
    }

    // Create work log
    const today = new Date();
    const workDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    const workLog = new WorkLog({
      employee: req.user._id,
      jobType: product.type,
      product: productId,
      partSize,
      operation: operation || undefined,
      totalParts,
      rejection,
      workDate,
      employeeName: req.user.name,
      employeeDepartment: req.user.department
    });

    await workLog.save();

    // Populate the response
    await workLog.populate('employee', 'name username department');
    await workLog.populate('product', 'type code partName');

    // Format response
    const formattedLog = {
      id: workLog._id,
      employeeId: workLog.employee._id,
      employeeName: workLog.employee.name,
      jobType: workLog.jobType,
      code: workLog.product.code,
      partName: workLog.product.partName,
      partSize: workLog.partSize,
      operation: workLog.operation,
      totalParts: typeof workLog.totalParts === 'number' ? workLog.totalParts : (typeof workLog.quantity === 'number' ? workLog.quantity : 0),
      rejection: typeof workLog.rejection === 'number' ? workLog.rejection : 0,
      date: workLog.workDate,
      timestamp: workLog.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Work log created successfully',
      data: formattedLog
    });
  } catch (error) {
    console.error('Create work log error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create work log',
      error: error.message
    });
  }
});

// Get work log statistics (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
  const { date, employee, jobType } = req.query;
    let matchStage = {};

    if (date) matchStage.workDate = date;
    if (employee) matchStage.employee = require('mongoose').Types.ObjectId(employee);
    if (jobType) matchStage.jobType = jobType;

    const stats = await WorkLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          totalParts: { $sum: { $ifNull: ['$totalParts', '$quantity'] } },
          totalRejection: { $sum: { $ifNull: ['$rejection', 0] } },
          uniqueEmployees: { $addToSet: '$employee' }
        }
      },
      {
        $project: {
          _id: 0,
          totalLogs: 1,
          totalParts: 1,
          totalRejection: 1,
          uniqueEmployeesCount: { $size: '$uniqueEmployees' }
        }
      }
    ]);

    const result = stats[0] || {
      totalLogs: 0,
      totalParts: 0,
      totalRejection: 0,
      uniqueEmployeesCount: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get work log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work log statistics',
      error: error.message
    });
  }
});

// Daily trend stats (admin only)
router.get('/daily', adminAuth, async (req, res) => {
  try {
    const { date, from, to, employee, jobType } = req.query;
    const match = {};

    if (employee) match.employee = require('mongoose').Types.ObjectId(employee);
    if (jobType) match.jobType = jobType;
    if (date) match.workDate = date;
    if (!date && (from || to)) {
      match.workDate = {};
      if (from) match.workDate.$gte = from;
      if (to) match.workDate.$lte = to;
    }

    const series = await WorkLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$workDate',
          totalParts: { $sum: { $ifNull: ['$totalParts', '$quantity'] } },
          totalRejection: { $sum: { $ifNull: ['$rejection', 0] } },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: '$_id', totalParts: 1, totalRejection: 1, okParts: { $subtract: ['$totalParts', '$totalRejection'] }, count: 1 } },
      { $sort: { date: 1 } },
    ]);

    res.json({ success: true, data: series });
  } catch (error) {
    console.error('WorkLogs daily error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch daily stats', error: error.message });
  }
});

// Per-employee productivity (admin only)
router.get('/by-employee', adminAuth, async (req, res) => {
  try {
    const { date, from, to, jobType } = req.query;
    const match = {};

    if (jobType) match.jobType = jobType;
    if (date) match.workDate = date;
    if (!date && (from || to)) {
      match.workDate = {};
      if (from) match.workDate.$gte = from;
      if (to) match.workDate.$lte = to;
    }

    const rows = await WorkLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$employee',
          employeeName: { $last: '$employeeName' },
          totalParts: { $sum: { $ifNull: ['$totalParts', '$quantity'] } },
          totalRejection: { $sum: { $ifNull: ['$rejection', 0] } },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, employeeId: '$_id', employeeName: 1, totalParts: 1, totalRejection: 1, okParts: { $subtract: ['$totalParts', '$totalRejection'] }, count: 1 } },
      { $sort: { totalParts: -1 } },
    ]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('WorkLogs by-employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch per-employee productivity', error: error.message });
  }
});

// Update a work log (admin only)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { totalParts, rejection, partSize, operation } = req.body || {};

    const log = await WorkLog.findById(id).populate('product', 'sizes type');
    if (!log) return res.status(404).json({ success: false, message: 'Work log not found' });

    // Validate updates
    if (typeof totalParts !== 'undefined') {
      if (typeof totalParts !== 'number' || totalParts < 1) {
        return res.status(400).json({ success: false, message: 'Total parts must be a positive number' });
      }
      log.totalParts = totalParts;
    }

    if (typeof rejection !== 'undefined') {
      if (typeof rejection !== 'number' || rejection < 0) {
        return res.status(400).json({ success: false, message: 'Rejection cannot be negative' });
      }
      const effectiveTotal = typeof totalParts === 'number' ? totalParts : (typeof log.totalParts === 'number' ? log.totalParts : log.quantity || 0);
      if (rejection > effectiveTotal) {
        return res.status(400).json({ success: false, message: 'Rejection cannot exceed total parts' });
      }
      log.rejection = rejection;
    }

    if (typeof partSize !== 'undefined') {
      if (!log.product || !Array.isArray(log.product.sizes) || !log.product.sizes.includes(partSize)) {
        return res.status(400).json({ success: false, message: 'Invalid part size for this product' });
      }
      log.partSize = partSize;
    }

    if (typeof operation !== 'undefined') {
      // Allow setting/clearing operation for all job types (sleeve/rod/pin)
      log.operation = operation || undefined;
    }

    await log.save();

    return res.json({ success: true, message: 'Work log updated' });
  } catch (error) {
    console.error('Update work log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update work log', error: error.message });
  }
});

// Delete a work log (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WorkLog.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Work log not found' });
    return res.json({ success: true, message: 'Work log deleted' });
  } catch (error) {
    console.error('Delete work log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete work log', error: error.message });
  }
});

module.exports = router;
 
// Admin utility: backfill snapshots on existing logs
router.post('/backfill-snapshots', adminAuth, async (req, res) => {
  try {
    const logs = await WorkLog.find({ $or: [{ employeeName: { $exists: false } }, { employeeName: null }, { employeeName: '' }] })
      .populate('employee', 'name department');

    let updated = 0;
    for (const log of logs) {
      const name = log.employee?.name || log.employeeName || 'Former Employee';
      const dept = log.employee?.department || log.employeeDepartment || undefined;
      const needsUpdate = log.employeeName !== name || log.employeeDepartment !== dept;
      if (needsUpdate) {
        log.employeeName = name;
        log.employeeDepartment = dept;
        await log.save();
        updated += 1;
      }
    }

    res.json({ success: true, message: 'Backfill complete', data: { updated } });
  } catch (error) {
    console.error('Backfill snapshots error:', error);
    res.status(500).json({ success: false, message: 'Backfill failed', error: error.message });
  }
});
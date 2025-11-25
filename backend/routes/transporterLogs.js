const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const TransporterLog = require('../models/TransporterLog');
const router = express.Router();

// --- SSE client registry for transporter logs ---
const transporterSseClients = [];

function formatTransporterLog(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    employeeId: doc.employee?._id,
    employeeName: doc.employee?.name || doc.employeeName || 'Former Employee',
    employeeDepartment: doc.employee?.department || doc.employeeDepartment || '—',
    jobType: doc.jobType,
    partyName: doc.partyName,
    partName: doc.partName || null,
    totalParts: doc.totalParts,
    rejection: doc.rejection || 0,
    weight: doc.weight || 0,
    date: doc.workDate,
    timestamp: doc.createdAt,
  };
}

function broadcastTransporterLog(eventType, payload) {
  const dataString = JSON.stringify({ eventType, data: payload });
  transporterSseClients.forEach((res) => {
    try {
      res.write(`event: message\n`);
      res.write(`data: ${dataString}\n\n`);
    } catch (e) {
      // Ignore broken pipe errors; clients cleaned elsewhere
    }
  });
}

// SSE stream endpoint (admin only for monitoring)
router.get('/stream', adminAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  transporterSseClients.push(res);

  // Initial ack
  res.write('event: message\n');
  res.write('data: {"eventType":"init","data":"transporter-stream-connected"}\n\n');

  req.on('close', () => {
    const idx = transporterSseClients.indexOf(res);
    if (idx !== -1) transporterSseClients.splice(idx, 1);
  });
});

// Heartbeat every 25s
setInterval(() => {
  broadcastTransporterLog('heartbeat', 'ping');
}, 25000);

// List transporter logs (admin gets all, employees get own)
router.get('/', auth, async (req, res) => {
  try {
    const { date, from, to, employee, jobType, partyName } = req.query;
    const filter = {};

    if (req.user.role === 'employee') filter.employee = req.user._id;
    if (employee && req.user.role === 'admin') filter.employee = employee;
    if (jobType) filter.jobType = jobType;
    if (partyName) filter.partyName = partyName;

    if (date) filter.workDate = date;
    if (!date && (from || to)) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = from;
      if (to) filter.workDate.$lte = to;
    }

    const logs = await TransporterLog.find(filter)
      .populate('employee', 'name department')
      .sort({ createdAt: -1 });

    const data = logs.map((l) => ({
      id: l._id,
      employeeId: l.employee?._id,
      employeeName: l.employee?.name || l.employeeName || 'Former Employee',
      employeeDepartment: l.employee?.department || l.employeeDepartment || '—',
      jobType: l.jobType,
      partyName: l.partyName,
      partName: l.partName || null,
      totalParts: l.totalParts,
      rejection: l.rejection || 0,
      weight: l.weight || 0,
      date: l.workDate,
      timestamp: l.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get transporter logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transporter logs', error: error.message });
  }
});

// Create transporter log
router.post('/', auth, async (req, res) => {
  try {
    const { jobType, partyName, totalParts, rejection = 0, partName, weight = 0 } = req.body;
    console.log('=== TRANSPORTER LOG POST REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user?.name, 'Department:', req.user?.department, 'Role:', req.user?.role);
    console.log('====================================');

    if (!jobType || !['outside-rod', 'outside-pin', 'outside-sleeve'].includes(jobType)) {
      return res.status(400).json({ success: false, message: 'Invalid job type' });
    }
    if (!partyName) return res.status(400).json({ success: false, message: 'Party name is required' });
    if (!partName) return res.status(400).json({ success: false, message: 'Part name is required' });
    if (typeof totalParts !== 'number' || totalParts < 1) return res.status(400).json({ success: false, message: 'Total parts must be at least 1' });
    if (rejection < 0) return res.status(400).json({ success: false, message: 'Rejection cannot be negative' });
    if (rejection > totalParts) return res.status(400).json({ success: false, message: 'Rejection cannot exceed total parts' });
    if (weight < 0) return res.status(400).json({ success: false, message: 'Weight cannot be negative' });

    // Only Transporter employees are allowed to create transporter logs
    if (!(req.user?.role === 'employee' && req.user?.department === 'Transporter')) {
      return res.status(403).json({ success: false, message: 'Only Transporter employees can create transporter logs' });
    }

    const today = new Date();
    const workDate = today.toISOString().split('T')[0];

    // Validate partName matches an existing Product for corresponding type
    try {
      const Product = require('../models/Product');
      const expectType = jobType === 'outside-rod' ? 'rod' : (jobType === 'outside-pin' ? 'pin' : 'sleeve');
      console.log(`Validating product: partName="${partName}", expectType="${expectType}"`);
      
      let productExists;
      if (expectType === 'sleeve') {
        // Sleeve products use 'code' field instead of 'partName'
        productExists = await Product.findOne({ code: partName, type: expectType }).lean();
      } else {
        // Rod and Pin use 'partName' field
        productExists = await Product.findOne({ partName, type: expectType }).lean();
      }
      
      console.log('Product found:', productExists);
      if (!productExists) {
        console.log('ERROR: Part name does not match any existing product');
        return res.status(400).json({ success: false, message: `Part name does not match any existing ${expectType} product` });
      }
    } catch (e) {
      console.warn('Product validation failed/skipped:', e?.message);
    }

    const log = new TransporterLog({
      employee: req.user._id,
      jobType,
      partyName,
      partName,
      totalParts,
      rejection,
      weight,
      workDate,
      employeeName: req.user.name,
      employeeDepartment: req.user.department,
    });
    await log.save();
    // populate employee snapshot for streaming payload
    await log.populate('employee', 'name department');
    broadcastTransporterLog('created', formatTransporterLog(log));

    res.status(201).json({ success: true, message: 'Transporter log created', data: { id: log._id, partName } });
  } catch (error) {
    console.error('Create transporter log error:', error);
    res.status(500).json({ success: false, message: 'Failed to create transporter log', error: error.message });
  }
});

// Stats (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { date, from, to, employee, jobType, partyName } = req.query;
    const match = {};

    if (employee) match.employee = require('mongoose').Types.ObjectId(employee);
    if (jobType) match.jobType = jobType;
    if (partyName) match.partyName = partyName;
    if (date) match.workDate = date;
    if (!date && (from || to)) {
      match.workDate = {};
      if (from) match.workDate.$gte = from;
      if (to) match.workDate.$lte = to;
    }

    const stats = await TransporterLog.aggregate([
      { $match: match },
      { $group: { _id: null, totalLogs: { $sum: 1 }, totalParts: { $sum: '$totalParts' }, totalRejection: { $sum: { $ifNull: ['$rejection', 0] } }, uniqueEmployees: { $addToSet: '$employee' } } },
      { $project: { _id: 0, totalLogs: 1, totalParts: 1, totalRejection: 1, uniqueEmployeesCount: { $size: '$uniqueEmployees' } } },
    ]);

    res.json({ success: true, data: stats[0] || { totalLogs: 0, totalParts: 0, totalRejection: 0, uniqueEmployeesCount: 0 } });
  } catch (error) {
    console.error('Transporter stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transporter stats', error: error.message });
  }
});

module.exports = router;
// Update transporter log (admin only)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { totalParts, rejection, partyName, jobType, partName, weight } = req.body || {};

    const log = await TransporterLog.findById(id);
    if (!log) return res.status(404).json({ success: false, message: 'Transporter log not found' });

    if (typeof jobType !== 'undefined') {
      if (!['outside-rod', 'outside-pin', 'outside-sleeve'].includes(jobType)) {
        return res.status(400).json({ success: false, message: 'Invalid job type' });
      }
      log.jobType = jobType;
    }

    if (typeof partyName !== 'undefined') {
      if (!partyName) return res.status(400).json({ success: false, message: 'Party name cannot be empty' });
      log.partyName = partyName;
    }

    if (typeof partName !== 'undefined') {
      if (!partName) return res.status(400).json({ success: false, message: 'Part name cannot be empty' });
      try {
        const Product = require('../models/Product');
        const expectType = (log.jobType === 'outside-rod') ? 'rod' : (log.jobType === 'outside-pin' ? 'pin' : 'sleeve');
        
        let productExists;
        if (expectType === 'sleeve') {
          // Sleeve products use 'code' field instead of 'partName'
          productExists = await Product.findOne({ code: partName, type: expectType }).lean();
        } else {
          // Rod and Pin use 'partName' field
          productExists = await Product.findOne({ partName, type: expectType }).lean();
        }
        
        if (!productExists) return res.status(400).json({ success: false, message: 'Part name not found for current job type' });
      } catch (e) {
        console.warn('Product validation failed during patch:', e?.message);
      }
      log.partName = partName;
    }

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
      const effectiveTotal = typeof totalParts === 'number' ? totalParts : log.totalParts;
      if (rejection > effectiveTotal) {
        return res.status(400).json({ success: false, message: 'Rejection cannot exceed total parts' });
      }
      log.rejection = rejection;
    }

    if (typeof weight !== 'undefined') {
      if (typeof weight !== 'number' || weight < 0) {
        return res.status(400).json({ success: false, message: 'Weight cannot be negative' });
      }
      log.weight = weight;
    }

    await log.save();
    await log.populate('employee', 'name department');
    broadcastTransporterLog('updated', formatTransporterLog(log));
    return res.json({ success: true, message: 'Transporter log updated' });
  } catch (error) {
    console.error('Update transporter log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update transporter log', error: error.message });
  }
});

// Delete transporter log (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TransporterLog.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Transporter log not found' });
    broadcastTransporterLog('deleted', { id });
    return res.json({ success: true, message: 'Transporter log deleted' });
  } catch (error) {
    console.error('Delete transporter log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete transporter log', error: error.message });
  }
});

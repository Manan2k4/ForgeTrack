const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const router = express.Router();

// Create or update attendance for a day
router.post('/', adminAuth, async (req, res) => {
  try {
    const { employeeId, date, present, note } = req.body;
    if (!employeeId || !date) return res.status(400).json({ success: false, message: 'employeeId and date are required' });
    const doc = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { $set: { present: present !== false, note: note || undefined } },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to save attendance', error: e.message });
  }
});

// List attendance for a month (by employee or all)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year are required' });
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const prefix = `${y}-${m}-`; // YYYY-MM-
    const q = { date: { $regex: `^${prefix}` } };
    if (employeeId) q.employeeId = employeeId;
    const list = await Attendance.find(q).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list attendance', error: e.message });
  }
});

// Summary: present days count per employee for month
router.get('/summary', adminAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year are required' });
    const m = String(month).padStart(2, '0');
    const y = String(year);
    const prefix = `${y}-${m}-`;
    const pipeline = [
      { $match: { date: { $regex: `^${prefix}` }, present: true } },
      { $group: { _id: '$employeeId', presentDays: { $sum: 1 } } },
    ];
    const agg = await Attendance.aggregate(pipeline);
    res.json({ success: true, data: agg });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to summarize attendance', error: e.message });
  }
});

module.exports = router;

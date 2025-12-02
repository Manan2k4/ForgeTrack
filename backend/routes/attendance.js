const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const router = express.Router();

// Upsert attendance for a specific date
router.post('/', adminAuth, async (req, res) => {
  try {
    const { employeeId, date, present, note } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ success: false, message: 'employeeId and date are required' });
    }
    const doc = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { $set: { present: !!present, note: note ?? '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    console.error('Upsert attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to upsert attendance', error: err.message });
  }
});

// Bulk delete attendance for employee & month/year
// IMPORTANT: Placed before any parameterized ":id" routes so "/bulk" is not captured as an id.
router.delete('/bulk', adminAuth, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!month || !year || !employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId, month and year are required' });
    }
    console.log('[ATTENDANCE BULK DELETE] incoming', { employeeId, month, year });
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`; // YYYY-MM
    const q = { employeeId, date: { $regex: `^${prefix}` } };
    const result = await Attendance.deleteMany(q);
    console.log('[ATTENDANCE BULK DELETE] result', { deletedCount: result.deletedCount });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Bulk delete attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed bulk delete', error: err.message });
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

// Update attendance by id
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { present, note } = req.body;
    const doc = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { present, note } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Attendance not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to update attendance', error: err.message });
  }
});

// Delete attendance by id
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const doc = await Attendance.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Attendance not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete attendance', error: err.message });
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

const express = require('express');
const { adminAuth } = require('../middleware/auth');
const Overtime = require('../models/Overtime');
const Attendance = require('../models/Attendance');
const router = express.Router();

// List overtime by employee/month/year
router.get('/', adminAuth, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'employeeId, month and year are required' });
    }
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`; // YYYY-MM
    const data = await Overtime.find({ employeeId, date: { $regex: `^${prefix}` } }).sort({ date: 1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error('List overtime error:', err);
    res.status(500).json({ success: false, message: 'Failed to list overtime', error: err.message });
  }
});

// Create overtime (requires presence on that date)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { employeeId, date, hours, rate } = req.body;
    if (!employeeId || !date || !hours) {
      return res.status(400).json({ success: false, message: 'employeeId, date and hours are required' });
    }
    const att = await Attendance.findOne({ employeeId, date });
    if (!att || att.present !== true) {
      return res.status(400).json({ success: false, message: `Employee was absent on ${date}. Cannot register overtime.` });
    }
    const ot = await Overtime.create({ employeeId, date, hours, rate });
    res.status(201).json({ success: true, data: ot });
  } catch (err) {
    console.error('Create overtime error:', err);
    res.status(500).json({ success: false, message: 'Failed to create overtime', error: err.message });
  }
});

// Update overtime
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { date, hours, rate } = req.body;
    const setUpdate = {};
    if (date) setUpdate.date = date;
    if (hours != null) setUpdate.hours = hours;
    if (rate != null) setUpdate.rate = rate;
    const ot = await Overtime.findByIdAndUpdate(
      req.params.id,
      { $set: setUpdate, $inc: { __v: 1 } },
      { new: true }
    );
    if (!ot) return res.status(404).json({ success: false, message: 'Overtime not found' });
    res.json({ success: true, data: ot });
  } catch (err) {
    console.error('Update overtime error:', err);
    res.status(500).json({ success: false, message: 'Failed to update overtime', error: err.message });
  }
});

// Delete overtime
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const ot = await Overtime.findByIdAndDelete(req.params.id);
    if (!ot) return res.status(404).json({ success: false, message: 'Overtime not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete overtime error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete overtime', error: err.message });
  }
});

module.exports = router;
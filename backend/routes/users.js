const express = require('express');
const User = require('../models/User');
const WorkLog = require('../models/WorkLog');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get employees (admin only) — supports optional includeInactive=true
router.get('/employees', adminAuth, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const findQuery = includeInactive ? { role: 'employee' } : { role: 'employee', isActive: true };

    const employees = await User.find(findQuery)
      .select('-password')
      .sort({ createdAt: -1 });

    const formatted = employees.map((e) => ({
      id: e._id,
      name: e.name,
      username: e.username,
      contact: e.contact,
      address: e.address,
      department: e.department,
      role: e.role,
      createdAt: e.createdAt,
      isActive: e.isActive,
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
});

// View single employee password (admin only)
router.get('/employees/:id/password', adminAuth, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('+passwordEnc');
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const plain = employee.getPlainPassword();
    if (!plain) {
      return res.status(400).json({ success: false, message: 'Password not available (encryption key missing or reset required)' });
    }
    return res.json({ success: true, data: { employeeId: employee._id, password: plain } });
  } catch (error) {
    console.error('View password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve password', error: error.message });
  }
});

// Create new employee (admin only)
router.post('/employees', adminAuth, async (req, res) => {
  try {
    const { name, username, password, contact, address, department } = req.body;

    // Validation
    if (!name || !username || !password || !contact || !address || !department) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new employee
    const employee = new User({
      name,
      username,
      password,
      contact,
      address,
      department,
      role: 'employee'
    });

    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    
    // Handle validation errors
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
      message: 'Failed to create employee',
      error: error.message
    });
  }
});

// Delete (deactivate) employee (admin only)
router.delete('/employees/:id', adminAuth, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Ensure employee exists
    const employee = await User.findById(employeeId).select('_id role isActive');
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employee.isActive === false) {
      return res.json({ success: true, message: 'Employee already deactivated' });
    }

    // Atomic update to avoid triggering validation on unrelated fields (e.g., legacy department values)
    await User.updateOne({ _id: employeeId, role: 'employee' }, { $set: { isActive: false } }, { runValidators: false });

    return res.json({ success: true, message: 'Employee deactivated. Historical work logs retained.' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete employee', error: error.message });
  }
});

// Quick seed: create a transporter test user (admin only)
router.post('/seed/transporter', adminAuth, async (req, res) => {
  try {
    const exists = await User.findOne({ username: 'transporter_test' });
    if (exists) {
      return res.json({ success: true, message: 'Transporter user already exists', data: { id: exists._id } });
    }
    const user = new User({
      name: 'Transporter Test',
      username: 'transporter_test',
      password: 'transporter123',
      role: 'employee',
      contact: 'N/A',
      address: 'N/A',
      department: 'Transporter',
    });
    await user.save();
    res.status(201).json({ success: true, message: 'Transporter user created', data: { id: user._id } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to seed transporter user', error: e.message });
  }
});

module.exports = router;

// Update employee (admin only)
router.put('/employees/:id', adminAuth, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { name, username, password, contact, address, department } = req.body;

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Username uniqueness check if changed
    if (username && username !== employee.username) {
      const exists = await User.findOne({ username });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
      employee.username = username;
    }

    if (name) employee.name = name;
    if (contact) employee.contact = contact;
    if (address) employee.address = address;
    if (department) employee.department = department;

    // If password provided, set and let pre('save') hash it
    if (password && password.trim().length >= 6) {
      employee.password = password;
      // Optional: flag to force change next login if admin changed password
      employee.forceChangePassword = true;
    }

    await employee.save();
    res.json({ success: true, message: 'Employee updated successfully', data: employee });
  } catch (error) {
    console.error('Update employee error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: 'Failed to update employee', error: error.message });
  }
});

// Reactivate employee (admin only)
router.post('/employees/:id/activate', adminAuth, async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employee = await User.findById(employeeId).select('_id role isActive');
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employee.isActive === true) {
      return res.json({ success: true, message: 'Employee already active' });
    }

    await User.updateOne({ _id: employeeId, role: 'employee' }, { $set: { isActive: true } }, { runValidators: false });
    return res.json({ success: true, message: 'Employee reactivated successfully' });
  } catch (error) {
    console.error('Activate employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to activate employee', error: error.message });
  }
});

// Permanent delete employee and their work logs (admin only)
router.delete('/employees/:id/permanent', adminAuth, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Ensure employee exists
    const employee = await User.findById(employeeId).select('_id role name');
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Delete all associated work logs
    const deletedLogs = await WorkLog.deleteMany({ employee: employeeId });
    
    // Delete the employee record
    await User.findByIdAndDelete(employeeId);

    return res.json({ 
      success: true, 
      message: `Employee ${employee.name} and ${deletedLogs.deletedCount} work logs permanently deleted.`,
      data: { deletedLogs: deletedLogs.deletedCount }
    });
  } catch (error) {
    console.error('Permanent delete employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete employee', error: error.message });
  }
});

// Admin utility: backfill legacy department values to new enum (e.g., Packaging -> Packing)
router.post('/employees/backfill-departments', adminAuth, async (req, res) => {
  try {
    const mappings = {
      'Packaging': 'Packing',
      'Sleeve workshop': 'Sleeve Workshop',
      'Rod/Pin workshop': 'Rod/Pin Workshop',
      'Transport': 'Transporter',
    };

    const fromValues = Object.keys(mappings);
    const bulkOps = [];
    const cursor = User.find({ role: 'employee', department: { $in: fromValues } }).cursor();
    for await (const u of cursor) {
      const to = mappings[u.department] || u.department;
      if (to !== u.department) {
        bulkOps.push({ updateOne: { filter: { _id: u._id }, update: { $set: { department: to } } } });
      }
    }
    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps, { ordered: false });
    }
    return res.json({ success: true, message: 'Backfill complete', data: { updated: bulkOps.length } });
  } catch (error) {
    console.error('Backfill departments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to backfill departments', error: error.message });
  }
});
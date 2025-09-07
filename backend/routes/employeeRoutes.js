// ForgeTrack/backend/routes/employeeRoutes.js
const express = require('express');
const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/employees/register
// @desc    Register a new employee (worker/transporter) by an admin
// @access  Private (Admin only)
router.post('/register', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { username, password, displayName, role, contact, address, department } = req.body;

    // Check if employee with this username already exists
    const employeeExists = await Employee.findOne({ username });

    if (employeeExists) {
        res.status(400); // Bad request
        throw new Error('Employee with this username already exists');
    }

    // Create new employee
    const employee = await Employee.create({
        username,
        password, // Password will be hashed by pre-save hook in model
        displayName,
        role,
        contact: role !== 'admin' ? contact : undefined,
        address: role !== 'admin' ? address : undefined,
        department: role !== 'admin' ? department : undefined,
        createdByAdmin: req.user._id // Store who created this employee
    });

    if (employee) {
        res.status(201).json({ // Created
            _id: employee._id,
            username: employee.username,
            displayName: employee.displayName,
            role: employee.role,
            contact: employee.contact,
            address: employee.address,
            department: employee.department,
            isActive: employee.isActive,
        });
    } else {
        res.status(400);
        throw new Error('Invalid employee data');
    }
}));

// @route   GET /api/employees
// @desc    Get all employees (for admin panel)
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const employees = await Employee.find({}).select('-password'); // Don't send passwords
    res.json(employees);
}));

// @route   PUT /api/employees/:id/toggle-status
// @desc    Toggle isActive status of an employee
// @access  Private (Admin only)
router.put('/:id/toggle-status', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id);

    if (employee) {
        // Prevent admin from disabling their own account or other admins (optional, but good practice)
        if (employee.role === 'admin' && employee._id.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Cannot toggle status of another admin account');
        }
        if (employee._id.toString() === req.user._id.toString()) {
             res.status(403);
             throw new Error('Cannot toggle status of your own account');
        }

        employee.isActive = !employee.isActive; // Toggle the status
        await employee.save();
        res.json({ message: 'Employee status updated', isActive: employee.isActive });
    } else {
        res.status(404); // Not found
        throw new Error('Employee not found');
    }
}));

// @route   PUT /api/employees/:id
// @desc    Update employee details
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { displayName, contact, address, department, role } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (employee) {
        // Prevent admin from changing their own role or other admins
        if (employee.role === 'admin' && employee._id.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Cannot modify another admin account');
        }
        if (employee._id.toString() === req.user._id.toString() && role !== employee.role) {
            res.status(403);
            throw new Error('Cannot change your own role');
        }

        employee.displayName = displayName || employee.displayName;
        employee.contact = contact !== undefined ? contact : employee.contact;
        employee.address = address !== undefined ? address : employee.address;
        employee.department = department !== undefined ? department : employee.department;
        employee.role = role || employee.role;

        const updatedEmployee = await employee.save();
        res.json({
            _id: updatedEmployee._id,
            username: updatedEmployee.username,
            displayName: updatedEmployee.displayName,
            role: updatedEmployee.role,
            contact: updatedEmployee.contact,
            address: updatedEmployee.address,
            department: updatedEmployee.department,
            isActive: updatedEmployee.isActive,
        });
    } else {
        res.status(404);
        throw new Error('Employee not found');
    }
}));

// @route   DELETE /api/employees/:id
// @desc    Delete an employee (hard delete - use with caution, consider soft delete)
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id);

    if (employee) {
        // Prevent admin from deleting their own account or other admins
        if (employee.role === 'admin' || employee._id.toString() === req.user._id.toString()) {
            res.status(403);
            throw new Error('Cannot delete admin accounts or your own account directly.');
        }

        await employee.deleteOne(); // Use deleteOne() for Mongoose 6+
        res.json({ message: 'Employee removed' });
    } else {
        res.status(404);
        throw new Error('Employee not found');
    }
}));

module.exports = router;

// ForgeTrack/backend/models/Employee.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
    // Unique identifier for the employee, used for login
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Hashed password for security
    password: {
        type: String,
        required: true
    },
    // Display name for the employee
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    // Employee contact information
    contact: {
        type: String,
        required: function() { return this.role !== 'admin'; }, // Not required for admin
        trim: true
    },
    // Employee address
    address: {
        type: String,
        required: function() { return this.role !== 'admin'; }, // Not required for admin
        trim: true
    },
    // Employee department
    department: {
        type: String,
        required: function() { return this.role !== 'admin'; }, // Not required for admin
        enum: ['Production', 'Quality Control', 'Maintenance', 'Assembly', 'Packaging', 'Other'],
        trim: true
    },
    // Role of the employee (admin, worker, transporter)
    role: {
        type: String,
        enum: ['admin', 'worker', 'transporter'], // Enforce specific roles
        required: true
    },
    // Status of the employee account (active/disabled)
    isActive: {
        type: Boolean,
        default: true
    },
    // Timestamp of account creation
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Reference to the admin who created this account (optional)
    createdByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee', // Refers to another Employee document
        required: false // Not required for the initial admin account
    }
});

// Pre-save hook to hash password before saving a new employee
EmployeeSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with hashed password
EmployeeSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);

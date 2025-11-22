const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['rod', 'sleeve', 'pin']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  partSize: {
    type: String,
    required: false, // Allow using only specialSize
    trim: true
  },
  specialSize: {
    type: String,
    trim: true
  },
  // Optional operation detail (per form selection, e.g., CASTING, BORE...)
  operation: {
    type: String,
    trim: true,
  },
  // Deprecated: use totalParts instead; kept for backward compatibility
  quantity: {
    type: Number,
    min: [1, 'Quantity must be at least 1']
  },
  totalParts: {
    type: Number,
    min: [1, 'Total parts must be at least 1']
  },
  rejection: {
    type: Number,
    min: [0, 'Rejection cannot be negative'],
    default: 0
  },
  // Snapshots to retain display info even if user is deactivated/deleted
  employeeName: {
    type: String,
    trim: true
  },
  employeeDepartment: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  workDate: {
    type: String, // Store as YYYY-MM-DD format for easy filtering
    required: true
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
workLogSchema.index({ employee: 1, workDate: -1 });
workLogSchema.index({ jobType: 1, workDate: -1 });
workLogSchema.index({ workDate: -1 });

module.exports = mongoose.model('WorkLog', workLogSchema);
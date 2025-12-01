const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startMonth: { type: Number, min: 1, max: 12, required: true },
    startYear: { type: Number, min: 2000, required: true },
    principal: { type: Number, required: true, min: 0 },
    defaultInstallment: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    status: { type: String, enum: ['active', 'closed', 'cancelled'], default: 'active' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

loanSchema.index({ employee: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);

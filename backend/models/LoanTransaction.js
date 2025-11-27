const mongoose = require('mongoose');

const loanTransactionSchema = new mongoose.Schema(
  {
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, min: 2000, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['salary-deduction', 'manual-payment'], default: 'salary-deduction' },
  },
  { timestamps: true }
);

loanTransactionSchema.index({ employee: 1, year: 1, month: 1 });
loanTransactionSchema.index({ loan: 1, year: 1, month: 1 });

module.exports = mongoose.model('LoanTransaction', loanTransactionSchema);

const mongoose = require('mongoose');

const upadEntrySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, min: 2000, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
  },
  { timestamps: true, optimisticConcurrency: true }
);

// Enforce single Upad entry per employee per month to avoid duplicates
upadEntrySchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
// Secondary index for sorting by creation time
upadEntrySchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('UpadEntry', upadEntrySchema);

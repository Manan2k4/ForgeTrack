const mongoose = require('mongoose');

const jobTypeSchema = new mongoose.Schema({
  partType: { type: String, enum: ['sleeve', 'rod', 'pin', 'general'], required: true },
  jobName: { type: String, required: true, trim: true },
  // Base rate (for backward compatibility / default)
  rate: { type: Number, min: 0, default: 0 }, // Rs per piece
  // Optional rate history so contract rates can change over time
  rateHistory: [{
    rate: { type: Number, min: 0 },
    effectiveFromYear: { type: Number, min: 1900 },
    effectiveFromMonth: { type: Number, min: 1, max: 12 },
  }],
}, { timestamps: true });

jobTypeSchema.index({ partType: 1, jobName: 1 }, { unique: true });
jobTypeSchema.index({ jobName: 1 });

module.exports = mongoose.model('JobType', jobTypeSchema);

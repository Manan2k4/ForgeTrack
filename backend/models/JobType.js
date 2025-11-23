const mongoose = require('mongoose');

const jobTypeSchema = new mongoose.Schema({
  partType: { type: String, enum: ['sleeve', 'rod', 'pin'], required: true },
  jobName: { type: String, required: true, trim: true },
}, { timestamps: true });

jobTypeSchema.index({ partType: 1, jobName: 1 }, { unique: true });
jobTypeSchema.index({ jobName: 1 });

module.exports = mongoose.model('JobType', jobTypeSchema);

const mongoose = require('mongoose');

const transporterLogSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobType: { type: String, enum: ['outside-rod', 'outside-pin'], required: true },
  partyName: { type: String, required: true, trim: true },
  // Part name selected from Product list (rod/pin) for traceability
  partName: { type: String, trim: true },
  totalParts: { type: Number, min: [1, 'Total parts must be at least 1'], required: true },
  rejection: { type: Number, min: [0, 'Rejection cannot be negative'], default: 0 },
  workDate: { type: String, required: true }, // YYYY-MM-DD
  employeeName: { type: String, trim: true },
  employeeDepartment: { type: String, trim: true },
}, { timestamps: true });

transporterLogSchema.index({ workDate: -1 });
transporterLogSchema.index({ employee: 1, workDate: -1 });
transporterLogSchema.index({ partyName: 1, workDate: -1 });
transporterLogSchema.index({ partName: 1, workDate: -1 });

module.exports = mongoose.model('TransporterLog', transporterLogSchema);

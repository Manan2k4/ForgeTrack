const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  hours: { type: Number, required: true },
  rate: { type: Number },
}, { timestamps: true });

overtimeSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model('Overtime', overtimeSchema);
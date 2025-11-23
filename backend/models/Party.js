const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  partyType: { type: String, enum: ['outside-rod', 'outside-pin', 'outside-sleeve'], required: true },
  partyName: { type: String, required: true, trim: true },
}, { timestamps: true });

partySchema.index({ partyType: 1, partyName: 1 }, { unique: true });
partySchema.index({ partyName: 1 });

module.exports = mongoose.model('Party', partySchema);

const express = require('express');
const Party = require('../models/Party');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// List parties (optionally filtered by partyType)
router.get('/', async (req, res) => {
  try {
    const { partyType } = req.query;
    const filter = partyType ? { partyType } : {};
    const parties = await Party.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: parties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch parties', error: error.message });
  }
});

// Create party
router.post('/', adminAuth, async (req, res) => {
  try {
    let { partyType, partyName } = req.body;
    if (typeof partyType === 'string') partyType = partyType.trim().toLowerCase();
    if (typeof partyName === 'string') partyName = partyName.trim();
    if (!partyType || !partyName) {
      return res.status(400).json({ success: false, message: 'partyType and partyName are required' });
    }
    if (!['outside-rod', 'outside-pin', 'outside-sleeve'].includes(partyType)) {
      return res.status(400).json({ success: false, message: 'Invalid partyType' });
    }
    const existing = await Party.findOne({ partyType, partyName }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Party already exists for this type' });
    }
    const party = new Party({ partyType, partyName });
    await party.save();
    res.status(201).json({ success: true, message: 'Party created', data: party });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate party' });
    }
    res.status(500).json({ success: false, message: 'Failed to create party', error: error.message });
  }
});

// Update party
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { partyType, partyName } = req.body;
    const doc = await Party.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Party not found' });
    if (partyType) {
      partyType = partyType.trim().toLowerCase();
      if (!['outside-rod', 'outside-pin', 'outside-sleeve'].includes(partyType)) {
        return res.status(400).json({ success: false, message: 'Invalid partyType' });
      }
      doc.partyType = partyType;
    }
    if (partyName) {
      partyName = partyName.trim();
      // uniqueness check
      const dup = await Party.findOne({ partyType: doc.partyType, partyName })
        .collation({ locale: 'en', strength: 2 });
      if (dup && String(dup._id) !== String(doc._id)) {
        return res.status(400).json({ success: false, message: 'Another party with this name exists for this type' });
      }
      doc.partyName = partyName;
    }
    await doc.save();
    res.json({ success: true, message: 'Party updated', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update party', error: error.message });
  }
});

// Delete party
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Party.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Party not found' });
    res.json({ success: true, message: 'Party deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete party', error: error.message });
  }
});

module.exports = router;

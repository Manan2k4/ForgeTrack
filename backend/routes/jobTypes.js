const express = require('express');
const JobType = require('../models/JobType');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// List job types (optional partType filter)
router.get('/', async (req, res) => {
  try {
    const { partType } = req.query;
    const filter = partType ? { partType } : {};
    const list = await JobType.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch job types', error: error.message });
  }
});

// Create job type
router.post('/', adminAuth, async (req, res) => {
  try {
    let { partType, jobName, rate } = req.body;
    console.log('Creating job type - received:', { partType, jobName, rate });
    if (typeof partType === 'string') partType = partType.trim().toLowerCase();
    if (typeof jobName === 'string') jobName = jobName.trim();
    console.log('After normalization:', { partType, jobName });
    if (!partType || !jobName) {
      return res.status(400).json({ success: false, message: 'partType and jobName are required' });
    }
    if (!['sleeve', 'rod', 'pin', 'general'].includes(partType)) {
      return res.status(400).json({ success: false, message: 'Invalid partType' });
    }
    const existing = await JobType.findOne({ partType, jobName }).collation({ locale: 'en', strength: 2 });
    if (existing) return res.status(400).json({ success: false, message: 'Job type already exists for this part type' });
    const doc = new JobType({ partType, jobName, rate: rate || 0 });
    await doc.save();
    console.log('Job type created:', doc);
    res.status(201).json({ success: true, message: 'Job type created', data: doc });
  } catch (error) {
    console.error('Create job type error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate job type' });
    res.status(500).json({ success: false, message: 'Failed to create job type', error: error.message });
  }
});

// Update job type (base fields and current rate)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { partType, jobName, rate } = req.body;
    const doc = await JobType.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job type not found' });
    if (partType) {
      partType = partType.trim().toLowerCase();
      if (!['sleeve', 'rod', 'pin', 'general'].includes(partType)) {
        return res.status(400).json({ success: false, message: 'Invalid partType' });
      }
      doc.partType = partType;
    }
    if (jobName) {
      jobName = jobName.trim();
      const dup = await JobType.findOne({ partType: doc.partType, jobName })
        .collation({ locale: 'en', strength: 2 });
      if (dup && String(dup._id) !== String(doc._id)) {
        return res.status(400).json({ success: false, message: 'Another job type with this name exists for this part type' });
      }
      doc.jobName = jobName;
    }
    if (typeof rate !== 'undefined') {
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum < 0) {
        return res.status(400).json({ success: false, message: 'Invalid rate value' });
      }
      doc.rate = rateNum;
    }
    await doc.save();
    res.json({ success: true, message: 'Job type updated', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update job type', error: error.message });
  }
});

// Append a rate history entry ("hike") for a job type
router.post('/:id/hikes', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { rate, effectiveFromYear, effectiveFromMonth } = req.body || {};

    const doc = await JobType.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job type not found' });

    const rateNum = Number(rate);
    const yearNum = Number(effectiveFromYear);
    const monthNum = Number(effectiveFromMonth);

    if (!Number.isFinite(rateNum) || rateNum < 0) {
      return res.status(400).json({ success: false, message: 'Invalid rate value' });
    }
    if (!Number.isInteger(yearNum) || yearNum < 1900) {
      return res.status(400).json({ success: false, message: 'Invalid effectiveFromYear' });
    }
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ success: false, message: 'Invalid effectiveFromMonth' });
    }

    const existing = Array.isArray(doc.rateHistory) ? doc.rateHistory : [];
    existing.push({ rate: rateNum, effectiveFromYear: yearNum, effectiveFromMonth: monthNum });
    // Sort ascending by effective date so history is stored in order
    existing.sort((a, b) => {
      const av = Number(a.effectiveFromYear) * 100 + Number(a.effectiveFromMonth);
      const bv = Number(b.effectiveFromYear) * 100 + Number(b.effectiveFromMonth);
      return av - bv;
    });
    doc.rateHistory = existing;

    // Optionally sync latest history rate into base rate as current default
    const latest = existing[existing.length - 1];
    if (latest && typeof latest.rate === 'number') {
      doc.rate = Number(latest.rate) || doc.rate;
    }

    await doc.save();
    res.json({ success: true, message: 'Rate history entry added', data: doc });
  } catch (error) {
    console.error('Add job type hike error:', error);
    res.status(500).json({ success: false, message: 'Failed to add rate history entry', error: error.message });
  }
});

// Update a specific rate history entry by index
router.patch('/:id/hikes/:index', adminAuth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid history index' });
    }

    const doc = await JobType.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job type not found' });

    const history = Array.isArray(doc.rateHistory) ? doc.rateHistory : [];
    if (idx >= history.length) {
      return res.status(404).json({ success: false, message: 'History entry not found' });
    }

    const entry = history[idx];
    let { rate, effectiveFromYear, effectiveFromMonth } = req.body || {};

    if (typeof rate !== 'undefined') {
      const rateNum = Number(rate);
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        return res.status(400).json({ success: false, message: 'Invalid rate value' });
      }
      entry.rate = rateNum;
    }
    if (typeof effectiveFromYear !== 'undefined') {
      const yearNum = Number(effectiveFromYear);
      if (!Number.isInteger(yearNum) || yearNum < 1900) {
        return res.status(400).json({ success: false, message: 'Invalid effectiveFromYear' });
      }
      entry.effectiveFromYear = yearNum;
    }
    if (typeof effectiveFromMonth !== 'undefined') {
      const monthNum = Number(effectiveFromMonth);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ success: false, message: 'Invalid effectiveFromMonth' });
      }
      entry.effectiveFromMonth = monthNum;
    }

    // Resort and sync latest into base rate
    history.sort((a, b) => {
      const av = Number(a.effectiveFromYear) * 100 + Number(a.effectiveFromMonth);
      const bv = Number(b.effectiveFromYear) * 100 + Number(b.effectiveFromMonth);
      return av - bv;
    });
    doc.rateHistory = history;

    const latest = history[history.length - 1];
    if (latest && typeof latest.rate === 'number') {
      doc.rate = Number(latest.rate) || doc.rate;
    }

    await doc.save();
    return res.json({ success: true, message: 'Rate history entry updated', data: doc });
  } catch (error) {
    console.error('Update job type hike error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update rate history entry', error: error.message });
  }
});

// Delete a specific rate history entry by index
router.delete('/:id/hikes/:index', adminAuth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid history index' });
    }

    const doc = await JobType.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job type not found' });

    const history = Array.isArray(doc.rateHistory) ? doc.rateHistory : [];
    if (idx >= history.length) {
      return res.status(404).json({ success: false, message: 'History entry not found' });
    }

    history.splice(idx, 1);

    // Resort and sync latest into base rate (or keep existing rate if no history)
    history.sort((a, b) => {
      const av = Number(a.effectiveFromYear) * 100 + Number(a.effectiveFromMonth);
      const bv = Number(b.effectiveFromYear) * 100 + Number(b.effectiveFromMonth);
      return av - bv;
    });
    doc.rateHistory = history;

    const latest = history[history.length - 1];
    if (latest && typeof latest.rate === 'number') {
      doc.rate = Number(latest.rate) || doc.rate;
    }

    await doc.save();
    return res.json({ success: true, message: 'Rate history entry deleted', data: doc });
  } catch (error) {
    console.error('Delete job type hike error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete rate history entry', error: error.message });
  }
});

// Delete job type
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await JobType.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Job type not found' });
    res.json({ success: true, message: 'Job type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete job type', error: error.message });
  }
});

module.exports = router;

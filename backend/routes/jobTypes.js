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
    let { partType, jobName } = req.body;
    if (typeof partType === 'string') partType = partType.trim().toLowerCase();
    if (typeof jobName === 'string') jobName = jobName.trim();
    if (!partType || !jobName) {
      return res.status(400).json({ success: false, message: 'partType and jobName are required' });
    }
    if (!['sleeve', 'rod', 'pin'].includes(partType)) {
      return res.status(400).json({ success: false, message: 'Invalid partType' });
    }
    const existing = await JobType.findOne({ partType, jobName }).collation({ locale: 'en', strength: 2 });
    if (existing) return res.status(400).json({ success: false, message: 'Job type already exists for this part type' });
    const doc = new JobType({ partType, jobName });
    await doc.save();
    res.status(201).json({ success: true, message: 'Job type created', data: doc });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate job type' });
    res.status(500).json({ success: false, message: 'Failed to create job type', error: error.message });
  }
});

// Update job type
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { partType, jobName } = req.body;
    const doc = await JobType.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job type not found' });
    if (partType) {
      partType = partType.trim().toLowerCase();
      if (!['sleeve', 'rod', 'pin'].includes(partType)) {
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
    await doc.save();
    res.json({ success: true, message: 'Job type updated', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update job type', error: error.message });
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

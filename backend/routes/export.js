const express = require('express');
const router = express.Router();

// POST /api/export/salary
// Expects form-encoded or JSON with fields: filename, html
router.post('/salary', (req, res) => {
  try {
    const { filename, html } = req.body || {};
    if (!html) return res.status(400).send('Missing html payload');
    const safeName = (filename || 'report').replace(/[^a-zA-Z0-9_\-\.]/g, '_') + '.xls';

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(Buffer.from(String(html), 'utf8'));
  } catch (err) {
    console.error('Export error', err);
    res.status(500).send('Export failed');
  }
});

module.exports = router;

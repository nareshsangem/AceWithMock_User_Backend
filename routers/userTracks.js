const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/track', async (req, res) => {
  const {
    user_id,
    event_type,
    page_path,
    referrer,
    category_id,
    subcategory_id,
    test_id,
    meta
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO analytics_events 
       (user_id, event_type, page_path, referrer, category_id, test_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_id || null,
        event_type || 'page_view',
        page_path || null,
        referrer || null,
        category_id || null,
        test_id || null,
        meta || {}
      ]
    );
    res.status(201).json({ message: 'Event tracked' });
  } catch (err) {
    console.error('🔴 Analytics error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const verifyAuthUser = require('../middleware/authMiddleware.js');
const pool = require('../db'); // ⬅️ Assuming you're using pg or pg-promise

// GET /protected/profile
router.get('/profile', verifyAuthUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, username, email, mobile, gender, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User authenticated',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error in /protected/profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

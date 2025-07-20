const pool = require('../../db');

// Get top 10 published categories
const getTopCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, image_url
       FROM categories
       WHERE is_published = true
       ORDER BY created_at DESC
       LIMIT 12`
    );
    
    res.status(200).json(result.rows);
    
  } catch (err) {
    console.error('Error fetching top categories:', err.message);
    res.status(500).json({ error: 'Server error while fetching categories' });
  }
};

//get all categories
const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, image_url
      FROM categories
      WHERE is_published = true
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
module.exports = { 
  getTopCategories,
  getAllCategories,
 };

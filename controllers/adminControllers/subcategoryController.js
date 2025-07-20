const pool = require('../../db');

// Get all subcategories
const getSubcategories = async (req, res) => {
    const categoryId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM subcategories 
       WHERE category_id = $1 AND is_published = true
       ORDER BY name ASC`,
      [categoryId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subcategories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPublishedSubcategoryIds = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subcategories WHERE is_published = true ORDER BY created_at DESC`
    );

    
    res.json({ subcategories : result.rows});
  } catch (err) {
    console.error('Error fetching subcategory IDs:', err);
    res.status(500).json({ error: 'Failed to fetch subcategory IDs' });
  }
};

module.exports = {
    getSubcategories,
    getPublishedSubcategoryIds,
}
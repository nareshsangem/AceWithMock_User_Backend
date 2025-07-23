const pool = require('../db');


const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, image_url
       FROM categories
       WHERE is_published = true
       ORDER BY created_at ASC`
    );

    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Error fetching all categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};



const getTopCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, image_url
       FROM categories
       WHERE is_published = true
       ORDER BY created_at ASC
       LIMIT 12`
    );

    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Error fetching top categories:', err);
    res.status(500).json({ error: 'Failed to fetch top categories' });
  }
};




const getSubcategoriesByCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const result = await pool.query(
      `SELECT *
       FROM subcategories
       WHERE is_published = true AND category_id = $1
       ORDER BY created_at ASC`,
      [categoryId]
    );
    
    res.json({ subcategories: result.rows });
  } catch (err) {
    console.error('Error fetching subcategories:', err);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
};

// 2. ✅ Get all published subcategory IDs
const getPublishedSubcategoryIds = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subcategories WHERE is_published = true ORDER BY created_at ASC`
    );

    
    res.json({ subcategories : result.rows});
  } catch (err) {
    console.error('Error fetching subcategory IDs:', err);
    res.status(500).json({ error: 'Failed to fetch subcategory IDs' });
  }
};



module.exports = {
  getTopCategories,
  getAllCategories,
  getSubcategoriesByCategory,
  getPublishedSubcategoryIds,
};

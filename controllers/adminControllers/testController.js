const pool = require('../../db');

const getTestsBySubcategory = async (req, res) => {
  const { subcategoryId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM tests WHERE subcategory_id = $1 ORDER BY order_number DESC`,
      [subcategoryId]
    );
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch tests by subcategory error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
};

module.exports = { getTestsBySubcategory };

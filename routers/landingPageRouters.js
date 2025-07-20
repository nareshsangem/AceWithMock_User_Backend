const express = require('express');
const router = express.Router();
const {
  getTopCategories,
  getAllCategories,
} = require('../controllers/landingPageControllers');

// Route: GET /public/categories/top
router.get('/categories/top', getTopCategories);

// Route: GET /public/categories/all
router.get('/categories/all', getAllCategories);


const {
  getSubcategoriesByCategory,
  getPublishedSubcategoryIds,
} = require('../controllers/landingPageControllers');

// GET /public/subcategories/by-category/:categoryId
router.get('/subcategories/by-category/:categoryId', getSubcategoriesByCategory);
    
// GET /public/subcategories/published-ids
router.get('/subcategories', getPublishedSubcategoryIds);
module.exports = router;
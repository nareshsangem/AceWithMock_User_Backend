const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
     getTopCategories,
    getAllCategories,
} = require('../controllers/adminControllers/testCategoryController')
const {
    getSubcategories,
    getPublishedSubcategoryIds
} = require('../controllers/adminControllers/subcategoryController');
// GET /category/top
router.get('/top',authMiddleware, getTopCategories);
router.get('/all',authMiddleware, getAllCategories);
router.get('/:id/subcategories',authMiddleware, getSubcategories);

router.get('/all-subcategories',authMiddleware, getPublishedSubcategoryIds);

module.exports = router;



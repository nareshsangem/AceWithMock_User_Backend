const express = require('express');
const router = express.Router();    

const authMiddleware = require('../middleware/authMiddleware');

const { getTestsBySubcategory } = require('../controllers/adminControllers/testController');



// Route to get test by subcategory
router.get('/by-subcategory/:subcategoryId',authMiddleware, getTestsBySubcategory);

module.exports = router;
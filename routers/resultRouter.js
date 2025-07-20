
const express = require('express');
const router = express.Router();

const {pdfGenerator} = require('../controllers/pdfGenerator');

const authMiddleware = require('../middleware/authMiddleware');

// Route to download wrong answers report
router.get('/attempts/:attemptId/download-wrong-report', authMiddleware, pdfGenerator);

module.exports = router;
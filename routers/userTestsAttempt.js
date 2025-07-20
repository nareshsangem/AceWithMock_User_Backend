const express = require("express");
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  startTest,
  saveAnswer,
  clearAnswer,
  submitTest,
  getTestById,
  getTestAttempt,
  getTestResult,
  activeAttempt,
  myAttempts,
} = require("../controllers/usertestController");

router.post("/startTest",authMiddleware, startTest);
router.post("/saveAnswer/:attemptId",authMiddleware,  saveAnswer);
router.post("/clearAnswer/:attemptId",authMiddleware,  clearAnswer);
router.post("/submitTest/:attemptId", authMiddleware, submitTest);
router.get("/tests/:id",authMiddleware, getTestById);
router.get('/testAttempt/:attemptId', authMiddleware, getTestAttempt);
router.get('/result/:attemptId',authMiddleware, getTestResult);
router.get('/activeAttempt/:testId',authMiddleware, activeAttempt);
router.get('/myAttempts', authMiddleware, myAttempts);

module.exports = router;

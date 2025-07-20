

const express = require("express");
const {
  sendOtpToEmailAndMobile,
  verifyEmailOtp,
  registerUser,
  loginUser,
  
  sendOtpForPasswordReset,
  verifyAndResetPassword,
  logOuttUser
} = require("../controllers/userAuthController.js");

const router = express.Router();

router.post("/send-otp", sendOtpToEmailAndMobile);
router.post("/verify-otp", verifyEmailOtp);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp-for-password-reset", sendOtpForPasswordReset);
router.post("/forgot-password/verify-reset", verifyAndResetPassword);
router.post("/logout", logOuttUser);
module.exports = router;

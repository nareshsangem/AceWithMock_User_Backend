const pool = require("../db");
const sendEmail = require("./sendEmail");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require('dotenv')
dotenv.config();

const sendOtpToEmailAndMobile = async (req, res) => {
  const { email, mobile } = req.body;

  if (!email || !mobile) {
    return res.status(400).json({ msg: "Email and mobile are required" });
  }
  //email or mobile exist in users table return already exist please too login
  const user = await pool.query("SELECT * FROM users WHERE email = $1 OR mobile = $2", [email, mobile]);
  if (user.rows.length > 0) {
    return res.status(400).json({ msg: "Email or mobile already exists" }); 
  }
  

 
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 mins
  const created = new Date(Date.now() + 5 * 60 * 1000); 
  try {
    // Remove any previous OTP for the same email or mobile
    await pool.query("DELETE FROM email_verification_otps WHERE email = $1 OR mobile = $2", [email, mobile]);

    // Insert new OTP
    await pool.query(
      "INSERT INTO email_verification_otps (email, mobile, otp, expires_at,created_at) VALUES ($1, $2, $3, $4, $5)",
      [email, mobile, otp, expiresAt,created]
    );
     
    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.OTP_EMAIL, // ✅ fixed typo from OTP_EMAI
        pass: process.env.OTP_PASS,
      },
     
    });

    await transporter.sendMail({
      from: `"AWM Support" <${process.env.OTP_EMAIL}>`,
      to: email,
      subject: "Your AWM OTP - Let's Begin Your Success Journey!",
      html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 24px;">
        <h2 style="color: #2874F0; text-align: center;">Welcome to AWM 🔥</h2>
        <p style="font-size: 16px; color: #333;">Dear Aspirant,</p>
        
        <p style="font-size: 15px; color: #444; line-height: 1.5;">
          You're one step away from unlocking your journey to success. Use the OTP below to verify your account and start preparing for your dream exam.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 16px 32px; background-color: #2874F0; color: white; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">
            ${otp}
          </div>
        </div>

        <p style="font-size: 15px; color: #555;">
          This OTP is valid for <strong>5 minutes</strong>. Please don’t share it with anyone.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 15px; color: #444; font-style: italic;">
          “Success is not for the lazy. Prepare smart, stay consistent, and rise above the rest.” 💪
        </p>

        <p style="margin-top: 30px; font-size: 14px; color: #888;">
          — Team AWM<br />
          <a href="https://acewithmock.netlify.app" style="color: #2874F0; text-decoration: none;">Visit our website</a> for more tips & practice tests.
        </p>
      </div>
    `
    });

    // Mock SMS for now

    res.json({ msg: "OTP sent to Email" });

  } catch (error) {
    console.error("OTP sending error:", error.message);
    res.status(500).json({ msg: "Failed to send OTP", error: error.message });
  }
};


const verifyEmailOtp = async (req, res) => {
  const { email, mobile, otp } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM email_verification_otps 
       WHERE email = $1 AND mobile = $2 AND otp = $3 AND expires_at > NOW()`,
      [email, mobile, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // OTP is valid — delete it
    await pool.query(
      "DELETE FROM email_verification_otps WHERE email = $1 AND mobile = $2",
      [email, mobile]
    );

    res.json({ msg: "OTP verified successfully" });

  } catch (error) {
    console.error("OTP verification failed:", error.message);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};



const registerUser = async (req, res) => {
  const { username, email, mobile, password, gender, agreed_to_terms } = req.body;

  const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0)
    return res.status(400).json({ msg: "Email already registered" });

  const password_hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, email, mobile, password_hash, gender, agreed_to_terms, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [username, email, mobile, password_hash, gender, agreed_to_terms]
  );

  res.json({ msg: "User registered successfully" });
};




const loginUser = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    // Determine if input is email or mobile using regex
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^\d{10}$/.test(identifier);

    if (!isEmail && !isMobile) {
      return res.status(400).json({ msg: "Invalid email or mobile format" });
    }

    const field = isEmail ? "email" : "mobile";
   
    const result = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
    const user = result.rows[0];
   
    if (!user) {
      return res.status(404).json({
        msg: isEmail ? "Email not found" : "Mobile number not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }
    
    
    const token = jwt.sign({ id: user.id, role: "user" }, process.env.USER_JWT_SECRET, {
      expiresIn: "7d",
    });
    
    res.cookie("user_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, msg: "Login successful", token, user });
    
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
//forgot password
const sendOtpForPasswordReset = async (req, res) => {
  const { identifier } = req.body;
  if (!identifier)
    return res.status(400).json({ success: false, msg: "Identifier required" });
 
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const field = isEmail ? "email" : "mobile";

  // Check if user exists
  const userQuery = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
  const user = userQuery.rows[0];
  if (!user)
    return res.status(404).json({ success: false, msg: `${field} not found` });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Clean up old OTPs
  await pool.query(`DELETE FROM email_verification_otps WHERE ${field} = $1`, [identifier]);

  // Insert new OTP
  await pool.query(
  `INSERT INTO email_verification_otps (email, mobile, otp,expires_at ,created_at)
   VALUES ($1, $2, $3, NOW(), NOW())`,
  [isEmail ? identifier : null, isEmail ? null : identifier, otp]
);
 
  // Send OTP
  if (isEmail) {
    await sendEmail(
      identifier,
        "AWM Password Reset OTP",
  `
  <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 24px;">
    <h2 style="color: #2874F0; text-align: center;">AWM – Password Reset Request</h2>

    <p style="font-size: 16px; color: #333;">Hi there,</p>

    <p style="font-size: 15px; color: #444;">
      We received a request to reset your password for your AWM account.
    </p>

    <p style="font-size: 15px; color: #444;">
      Use the OTP below to complete the process. This code is valid for <strong>5 minutes</strong>:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; padding: 16px 32px; background-color: #2874F0; color: white; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">
        ${otp}
      </div>
    </div>

    <p style="font-size: 15px; color: #555;">
      Didn’t request a reset? You can safely ignore this email.
    </p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

    <p style="font-size: 14px; color: #888;">
      💡 Stay secure: Never share your OTP or password with anyone.
    </p>

    <p style="margin-top: 30px; font-size: 14px; color: #888;">
      — Team AWM<br/>
      <a href="https://acewithmock.netlify.app" style="color: #2874F0; text-decoration: none;">Visit AWM</a> for more tools and test prep help.
    </p>
  </div>
  `

    );
  } else {
    
  }

  res.json({ success: true, msg: "OTP sent successfully" });
};

const verifyAndResetPassword = async (req, res) => {
  const { identifier, otp, newPassword } = req.body;
  if (!identifier || !otp || !newPassword)
    return res.status(400).json({ success: false, msg: "All fields required" });

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const field = isEmail ? "email" : "mobile";

  // Check OTP validity and expiry (10 min)
  const otpQuery = await pool.query(
    `SELECT * FROM email_verification_otps WHERE ${field} = $1 AND otp = $2 AND created_at > NOW() - INTERVAL '10 minutes'`,
    [identifier, otp]
  );

  if (otpQuery.rows.length === 0)
    return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE ${field} = $2`,
    [hashedPassword, identifier]
  );

  // Clean up OTP
  await pool.query(`DELETE FROM email_verification_otps WHERE ${field} = $1`, [identifier]);

  res.json({ success: true, msg: "Password reset successful" });
};

const logOuttUser = async (req, res) => {
  res.clearCookie("user_token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/", // IMPORTANT: must match how cookie was originally set
  });
  res.json({ success: true, msg: "Logout successful" });
};

module.exports ={
  sendOtpToEmailAndMobile,
  verifyEmailOtp,
  registerUser,
  loginUser,
  sendOtpForPasswordReset ,
  verifyAndResetPassword,
  logOuttUser,
}
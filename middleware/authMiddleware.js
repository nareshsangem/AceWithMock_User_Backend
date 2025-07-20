// middlewares/verifyAuthUser.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Use a secure secret, preferably from environment variables
const SECRET = process.env.USER_JWT_SECRET || 'User Portal';

const verifyAuthUser = (req, res, next) => {
  const token = req.cookies.user_token;
  if (!token) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // You can now access user info in req.user

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: 'Invalid or expired token.' });
    
  }
};

module.exports = verifyAuthUser;

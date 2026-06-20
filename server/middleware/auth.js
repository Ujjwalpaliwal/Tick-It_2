const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization token missing or invalid format.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = process.env.JWT_SECRET || 'tickit_secret_key';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User associated with this token not found.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    res.status(401).json({ success: false, error: 'Session expired or invalid token. Please log in again.' });
  }
};

module.exports = auth;

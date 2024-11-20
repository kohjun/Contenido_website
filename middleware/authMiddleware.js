  //middleware/authMiddlewares.js
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const JWT_SECRET = process.env.JWT_SECRET;

  const authenticateToken = async (req, res, next) => {
    const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired, please login again.' });
        }
        console.error('Token verification error:', err);
        return res.status(403).json({ message: 'Forbidden' });
      }

      try {
        const user = await User.findById(decoded.id);
        if (!user) {
          return res.status(401).json({ message: 'User not found.' });
        }

        req.user = user;
        next();
      } catch (error) {
        console.error('Error during user lookup:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
  };

  module.exports = authenticateToken;

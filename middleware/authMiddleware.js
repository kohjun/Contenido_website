//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed', err);
      return res.status(403).json({ message: 'Forbidden' });
    }
  
    console.log('Decoded user from JWT:', user); // Log the decoded user for verification
    req.user = user; // Set the decoded user info in req.user
    next();
  });
};

module.exports = authenticateToken;
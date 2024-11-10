//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 디버깅: 검증된 사용자 정보 출력
    console.log('Decoded User from JWT:', user);

    req.user = user; // Ensure this contains _id, displayName, etc.
    next();
  });
};


module.exports = authenticateToken;
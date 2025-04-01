//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = await jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 토큰 만료 1시간 전에 자동 갱신
    if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) - Date.now() < 60 * 60 * 1000) {
      if (user.kakaoRefreshToken) {
        try {
          // 새로운 액세스 토큰 발급
          const newToken = jwt.sign(
            { 
              id: user._id, 
              role: user.role, 
              displayName: user.displayName, 
              email: user.email 
            },
            JWT_SECRET,
            { expiresIn: '5h' }
          );

          user.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
          await user.save();

          // 새로운 토큰을 쿠키에 설정
          res.cookie('jwt', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
          });
        } catch (error) {
          console.error('Token refresh error:', error);
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;

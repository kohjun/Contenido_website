//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { refreshAccessToken } = require('../config/passportConfig'); // Refresh Token 함수 가져오기
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

    // Access Token 만료 시 Refresh Token으로 갱신
    if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) <= Date.now()) {
      if (user.kakaoRefreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(user);

          // 새로운 JWT 생성 및 쿠키에 저장
          const newToken = jwt.sign(
            { id: user._id, role: user.role, displayName: user.displayName, email: user.email },
            JWT_SECRET,
            { expiresIn: '5h' }
          );

          res.cookie('jwt', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          });
        } catch (error) {
          console.error('Error refreshing access token:', error);
          return res.status(401).json({ message: 'Failed to refresh access token' });
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

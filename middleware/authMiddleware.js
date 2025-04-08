//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyRefreshToken } = require('../config/passportConfig');

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token);
        const user = await User.findById(decoded.id);

        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        // 리프레시 토큰 확인
        const isRefreshValid = await verifyRefreshToken(user);

        if (isRefreshValid) {
          // 새로운 JWT 토큰 발급
          const newToken = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
          );

          // 새 토큰을 쿠키에 설정
          res.cookie('jwt', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1일
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
          });

          req.user = user;
          return next();
        }
      } catch (err) {
        console.error('Error refreshing token:', err);
      }
      
      return res.status(401).json({ 
        message: 'Token expired',
        redirect: '/auth/kakao'
      });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;

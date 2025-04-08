const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenService = require('../utils/TokenService');

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    const refreshedUser = await TokenService.refreshUserToken(req);
    if (refreshedUser) {
      req.user = refreshedUser;
      return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 카카오 토큰 유효성 검사 및 갱신
    const isTokenValid = await TokenService.verifyKakaoToken(user.kakaoAccessToken);
    if (!isTokenValid) {
      const refreshedUser = await TokenService.refreshAccessToken(user);
      if (!refreshedUser) {
        return res.status(401).json({ message: 'Token refresh failed' });
      }
      req.user = refreshedUser;
    } else {
      req.user = user;
    }

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const refreshedUser = await TokenService.refreshUserToken(req);
      if (refreshedUser) {
        req.user = refreshedUser;
        return next();
      }
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;
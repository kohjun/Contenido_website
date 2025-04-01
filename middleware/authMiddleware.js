//middleware/authMiddlewares.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { refreshAccessToken } = require('../config/passportConfig');
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

    // 카카오 토큰 만료 확인
    const kakaoToken = decoded.kakaoToken;
    const tokenExpiry = new Date(Date.now() + kakaoToken.expires_in);

    if (tokenExpiry <= Date.now()) {
      // 토큰이 만료된 경우 재로그인 요청
      res.clearCookie('jwt');
      return res.status(401).json({ 
        message: 'Token expired', 
        redirect: '/auth/kakao' 
      });
    }

    req.user = user;
    req.kakaoToken = kakaoToken; // 카카오 토큰 정보 요청 객체에 추가
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.clearCookie('jwt');
      return res.status(401).json({ 
        message: 'Token expired',
        redirect: '/auth/kakao'
      });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;

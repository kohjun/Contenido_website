const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenService = require('../utils/TokenService');

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwt || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    // console.log('토큰이 없음, 토큰 갱신 시도');
    const refreshedUser = await TokenService.refreshUserToken(req);
    if (refreshedUser) {
      // console.log(`사용자 ${refreshedUser._id} 토큰 갱신 성공`);
      req.user = refreshedUser;
      return next();
    }
    return res.status(401).json({ message: '인증이 필요합니다' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(`인증 토큰에서 추출한 사용자 ID: ${decoded.id}, 역할: ${decoded.role}`);
    
    const user = await User.findById(decoded.id)
      .select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');

    if (!user) {
      console.log(`ID ${decoded.id}에 해당하는 사용자가 없음`);
      return res.status(401).json({ message: '사용자를 찾을 수 없음' });
    }

    // 카카오 토큰 유효성 검사 및 갱신
    const isTokenValid = await TokenService.verifyKakaoToken(user.kakaoAccessToken);
    if (!isTokenValid) {
      // console.log(`사용자 ${user._id}의 카카오 토큰 만료, 갱신 시도`);
      const refreshedUser = await TokenService.refreshAccessToken(user);
      if (!refreshedUser) {
        // console.log(`사용자 ${user._id}의 토큰 갱신 실패`);
        return res.status(401).json({ message: '토큰 갱신 실패' });
      }
      req.user = refreshedUser;
      // console.log(`사용자 ${refreshedUser._id}의 토큰 갱신 성공`);
    } else {
      req.user = user;
      // console.log(`사용자 ${user._id}의 토큰 유효 확인`);
    }

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // console.log('JWT 토큰 만료, 갱신 시도');
      const refreshedUser = await TokenService.refreshUserToken(req);
      if (refreshedUser) {
        // console.log(`사용자 ${refreshedUser._id} 만료된 토큰 갱신 성공`);
        req.user = refreshedUser;
        return next();
      }
    }
    console.error('인증 에러:', error.name, error.message);
    return res.status(401).json({ message: '유효하지 않은 토큰' });
  }
};

module.exports = authenticateToken;
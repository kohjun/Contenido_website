// const mongoose = require('mongoose');

// const authenticateToken = async (req, res, next) => {
//   // 실제 사용자 정보를 사용한 더미 데이터
//   const dummyUser = {
//     _id: '673aed9a051a576b3e2285e1',
//     id: '673aed9a051a576b3e2285e1',
//     email: 'kohjunn@naver.com',
//     displayName: '고 준',
//     profileImage: 'https://img1.kakaocdn.net/thumb/R640x640.q70/?fname=http://t1.kakaocdn.net/account_images/default_profile.jpeg',
//     role: 'admin',
//     team: 'operationTeam',
//     department: 'operation',
//     isDepartmentHead: true,
//     isActive: true,
//     isAdditionalInfoComplete: true,
//     name: '고준',
//     phonenumber: '01022458697',
//     gender: 'male',
//     birthDate: new Date('2000-01-30'),
//     preferredActivity: '노원구'
//   };

//   req.user = dummyUser;
  
//   if (req.session) {
//     req.session.userId = dummyUser.id;
//   }

//   next();
// };

// module.exports = authenticateToken;

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
      const refreshedUser = await TokenService.refreshAccessToken(user);
      if (!refreshedUser) {
        return res.status(401).json({ message: '토큰 갱신 실패' });
      }
      // 프로필 정보도 함께 업데이트
      req.user = await TokenService.updateUserProfile(refreshedUser);
    } else {
      req.user = user;
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
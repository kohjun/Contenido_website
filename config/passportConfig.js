// config/passportConfig.js 파일 수정
const passport = require('passport'); // 이 줄을 추가해야 합니다
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 리프레시 토큰 검증
const verifyRefreshToken = async (user) => {
  if (!user.refreshToken || !user.refreshTokenExpiry) {
    return false;
  }
  
  // 만료 시간 확인
  if (new Date() > user.refreshTokenExpiry) {
    return false;
  }

  return true;
};

// 리프레시 토큰 저장
const saveRefreshToken = async (userId, refreshToken) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14); // 14일 후 만료

  await User.findByIdAndUpdate(userId, {
    refreshToken: refreshToken,
    refreshTokenExpiry: expiry,
    lastRefreshTokenUse: new Date()
  });
};

const setupPassport = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET || undefined, // 선택적
        callbackURL: process.env.KAKAO_CALLBACK_URL,
        scope: ['profile_nickname', 'profile_image', 'account_email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account?.email;
          if (!email) {
            return done(null, false, { message: '이메일이 필요합니다' });
          }

          let user = await User.findOne({ email });
          
          if (user) {
            // 기존 사용자의 카카오 토큰 업데이트
            user.kakaoAccessToken = accessToken;
            user.kakaoRefreshToken = refreshToken;
            await user.save();
          } else {
            // 새 사용자 생성
            user = await User.create({
              email,
              displayName: profile._json.properties.nickname,
              profileImage: profile._json.properties.profile_image,
              kakaoId: profile.id,
              kakaoAccessToken: accessToken,
              kakaoRefreshToken: refreshToken,
              role: 'guest'
            });
          }

          // 토큰 정보를 포함하여 사용자 객체 전달
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    try {
      done(null, user.id || user._id);
    } catch (err) {
      console.error('Serialize error:', err);
      done(err);
    }
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('Deserialize error:', err);
      done(err);
    }
  });
};

module.exports = { setupPassport, verifyRefreshToken, saveRefreshToken };
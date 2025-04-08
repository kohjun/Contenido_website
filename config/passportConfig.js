// config/passportConfig.js
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * 리프레시 토큰 검증
 * @param {Object} user - 사용자 객체
 * @returns {Boolean} 토큰이 유효한지 여부
 */
const verifyRefreshToken = async (user) => {
  if (!user.refreshToken || !user.refreshTokenExpiry) {
    return false;
  }
  
  // 만료 시간 확인 (Date 객체가 아닐 경우 변환)
  const expiryDate = user.refreshTokenExpiry instanceof Date 
    ? user.refreshTokenExpiry 
    : new Date(user.refreshTokenExpiry);
    
  return new Date() < expiryDate;
};

/**
 * 리프레시 토큰 저장
 * @param {String} userId - 사용자 ID
 * @param {String} refreshToken - 리프레시 토큰
 */
const saveRefreshToken = async (userId, refreshToken) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14); // 14일 후 만료

  await User.findByIdAndUpdate(userId, {
    refreshToken: refreshToken,
    refreshTokenExpiry: expiry,
    lastRefreshTokenUse: new Date()
  });
};

/**
 * Passport 설정
 * @param {Object} passport - Passport 인스턴스
 */
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
         
          
          // 이메일 확인 (필수)
          const email = profile._json.kakao_account?.email;
          if (!email) {
            console.log('이메일 정보가 없습니다');
            return done(null, false, { message: '이메일이 필요합니다' });
          }

          let user = await User.findOne({ email });
          
          if (user) {
            // 기존 사용자의 카카오 토큰 업데이트
            user.kakaoAccessToken = accessToken;
            user.profileImage = profile._json.properties.profile_image || user.profileImage;
            user.displayName = profile._json.properties.nickname || user.displayName;
            await user.save();
            console.log('기존 사용자 로그인:', user.email);
          } else {
            // 새 사용자 생성
            user = await User.create({
              email,
              displayName: profile._json.properties.nickname,
              profileImage: profile._json.properties.profile_image,
              kakaoId: profile.id,
              role: 'guest'
            });
            console.log('새 사용자 생성:', user.email);
          }

          return done(null, user);
        } catch (err) {
          console.error('카카오 인증 오류:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    try {
      done(null, user.id);
    } catch (err) {
      console.error('Serialize error:', err);
      done(err);
    }
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        console.log('사용자를 찾을 수 없음:', id);
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
require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');

// 토큰 요청 관리를 위한 메모리 캐시
const tokenCache = new Map();

const setupPassport = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        callbackURL: process.env.KAKAO_CALLBACK_URL,
        scope: ['profile_nickname', 'profile_image', 'account_email'],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account?.email;

          if (!email) {
            return done(null, false, { message: 'Email is required.' });
          }

          // 캐시된 사용자 확인
          if (tokenCache.has(email)) {
            const cachedUser = tokenCache.get(email);
            if (cachedUser.tokenExpiresAt > Date.now()) {
              return done(null, cachedUser);
            }
          }

          let user = await User.findOne({ email });

          if (user) {
            // 토큰 업데이트가 필요한 경우에만 수행
            if (!user.tokenExpiresAt || user.tokenExpiresAt <= Date.now()) {
              user.kakaoAccessToken = accessToken;
              user.kakaoRefreshToken = refreshToken;
              user.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
              await user.save();
            }
            // 캐시에 사용자 정보 저장
            tokenCache.set(email, user);
            return done(null, user);
          }

          // 신규 사용자 생성
          user = await User.create({
            email,
            displayName: profile._json.properties.nickname,
            profileImage: profile._json.properties.profile_image,
            kakaoId: profile.id,
            isVerified: true,
            role: 'guest',
            kakaoAccessToken: accessToken,
            kakaoRefreshToken: refreshToken,
            tokenExpiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000)
          });

          // 캐시에 저장
          tokenCache.set(email, user);
          return done(null, user);
        } catch (err) {
          // 에러 발생 시 재시도 로직
          if (err.code === 'invalid_request' && err.status === 500) {
            return setTimeout(() => {
              done(err, null);
            }, 1000); // 1초 대기 후 재시도
          }
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

// 주기적으로 캐시 정리 (1시간마다)
setInterval(() => {
  const now = Date.now();
  for (const [email, user] of tokenCache.entries()) {
    if (user.tokenExpiresAt <= now) {
      tokenCache.delete(email);
    }
  }
}, 60 * 60 * 1000);

// 토큰 관련 함수들
const verifyRefreshToken = async (user) => {
  try {
    // 리프레시 토큰이 없거나 만료된 경우
    if (!user.kakaoRefreshToken || !user.tokenExpiresAt || user.tokenExpiresAt <= Date.now()) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return false;
  }
};

const refreshAccessToken = async (user) => {
  try {
    const newTokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5시간
    user.tokenExpiresAt = newTokenExpiresAt;
    await user.save();
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// 모듈 내보내기
module.exports = {
  setupPassport,
  verifyRefreshToken,
  refreshAccessToken
};

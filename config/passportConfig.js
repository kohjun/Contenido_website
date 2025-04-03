//config/passportConfig.js
require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');

module.exports.setupPassport = (passport) => {
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

          // 이메일이 없는 경우 처리
          if (!email) {
            return done(null, false, { message: 'Email is required.' });
          }

          let user = await User.findOne({ email });

          if (user) {
            // 기존 토큰이 유효한 경우 재사용
            if (user.tokenExpiresAt && user.tokenExpiresAt > Date.now()) {
              return done(null, user);
            }

            // 토큰 업데이트는 background로 처리
            setTimeout(async () => {
              try {
                user.kakaoAccessToken = accessToken;
                user.kakaoRefreshToken = refreshToken;
                user.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
                await user.save();
              } catch (err) {
                console.error('Background token update failed:', err);
              }
            }, 0);

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
          });

          return done(null, user);
        } catch (err) {
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

// Refresh Token으로 새로운 Access Token 생성
async function refreshAccessToken(user) {
  try {
    const newTokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5시간
    user.tokenExpiresAt = newTokenExpiresAt;
    await user.save();
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

async function verifyRefreshToken(user) {
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
}

module.exports.verifyRefreshToken = verifyRefreshToken;
module.exports.refreshAccessToken = refreshAccessToken;

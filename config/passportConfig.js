require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');

const setupPassport = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        callbackURL: process.env.KAKAO_CALLBACK_URL,
        scope: ['profile_nickname', 'profile_image', 'account_email', 'openid'],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account?.email;
          const tokenExpiresIn = 43199; // 12시간

          if (!email) {
            return done(null, false, { message: 'Email is required.' });
          }

          let user = await User.findOne({ email });

          if (user) {
            // 토큰 업데이트
            user.kakaoAccessToken = accessToken;
            user.kakaoRefreshToken = refreshToken;
            user.tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);
            user.refreshTokenExpiresAt = new Date(Date.now() + 5184000 * 1000);
            await user.save();
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
            tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
            refreshTokenExpiresAt: new Date(Date.now() + 5184000 * 1000)
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

module.exports = { setupPassport };
//config/passportConfig.js
require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');
const axios = require('axios'); // Axios 추가

module.exports = (passport) => {
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
          const kakaoId = profile.id;
          const displayName = profile._json.properties.nickname;
          const profileImage = profile._json.properties.profile_image || '/images/basic_Image.png';
          const email = profile._json.kakao_account?.email;

          if (!email) {
            console.error("Error: Kakao did not provide an email.");
            return done(null, false, { message: 'Email is required.' });
          }

          let user = await User.findOne({ email });

          if (user) {
            // Access Token 캐싱 및 Refresh Token 저장
            user.kakaoAccessToken = accessToken;
            user.kakaoRefreshToken = refreshToken;
            user.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5시간
            if (profileImage) user.profileImage = profileImage;

            await user.save();
          } else {
            user = await User.create({
              email,
              displayName,
              profileImage,
              kakaoId,
              kakaoAccessToken: accessToken,
              kakaoRefreshToken: refreshToken,
              tokenExpiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
              isVerified: true,
              role: 'guest',
            });
          }

          return done(null, user);
        } catch (err) {
          console.error("Error during user login:", err);
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

// Refresh Token을 사용해 Access Token 갱신 함수 추가
async function refreshAccessToken(user) {
  try {
    const response = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.KAKAO_CLIENT_ID,
        refresh_token: user.kakaoRefreshToken,
      },
    });

    user.kakaoAccessToken = response.data.access_token;
    user.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    await user.save();

    return user.kakaoAccessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

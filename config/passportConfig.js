//config/passportConfig.js
require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');

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
            user.displayName = displayName;
            user.kakaoId = kakaoId;
            if (profileImage) user.profileImage = profileImage;

            await user.save();
          } else {
            user = await User.create({
              email,
              displayName,
              profileImage,
              kakaoId,
              isVerified: true,
              role: 'participant',
              
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

// config/passportConfig.js
require('dotenv').config({ path: './.env' }); // Load .env file from the root directory
console.log('KAKAO_CLIENT_ID from app.js:', process.env.KAKAO_CLIENT_ID); // Debugging line to check if it loads
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');
module.exports = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        callbackURL: process.env.KAKAO_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract the required information from the Kakao profile
          const kakaoId = profile.id;
          const displayName = profile._json.properties.nickname;  // profile_nickname
          const profileImage = profile._json.properties.profile_image;  // profile_image

          // Check if the user exists in the database
          let user = await User.findOne({ kakaoId });
          if (!user) {
            // Create a new user if they don't exist
            user = await User.create({
              kakaoId,
              displayName,
              profileImage,
              isVerified: true,
            });
          }
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

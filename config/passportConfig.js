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
        scope: ['profile_nickname', 'profile_image', 'account_email'], // Ensure these scopes are enabled in Kakao developer console
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Extract user data from Kakao profile
          const kakaoId = profile.id;
          const displayName = profile._json.properties.nickname;
          const profileImage = profile._json.properties.profile_image || '/images/basic_Image.png';
          const email = profile._json.kakao_account?.email;

          if (!email) {
            console.error("Error: Kakao did not provide an email.");
            return done(new Error('Email is required but was not provided by Kakao.'), null);
          }

          // Find or create user by email
          let user = await User.findOne({ email });
          if (user) {
            // Update existing user data if necessary
            user.displayName = displayName;
            user.kakaoId = kakaoId; // Store Kakao ID
            user.isVerified = true;
            if (profileImage) user.profileImage = profileImage;

            await user.save();
          } else {
            // Create a new user if none exists
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

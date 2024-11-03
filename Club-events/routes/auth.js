const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure this middleware is availabl
const User = require('../models/User');
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = 'http://localhost:3000/auth/final-logout';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const router = express.Router();
// Initiate Kakao login
router.get('/kakao', passport.authenticate('kakao'));

// Kakao callback to handle login and generate JWT token
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const profile = req.user;
      const email = profile.email;
      const displayName = profile.displayName; // Add displayName

      // Generate JWT token with all user details
      const token = jwt.sign(
        { id: profile._id, role: profile.role, displayName, email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Send the token in a secure cookie
      res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      res.redirect('/events.html'); // Redirect to events page after login
    } catch (error) {
      console.error("Error during user login:", error);
      res.redirect('/');
    }
  }
);


router.get('/user-role', authenticateToken, (req, res) => {
  if (req.user) {
      res.json({ role: req.user.role });
  } else {
      res.status(401).json({ message: 'Unauthorized' });
  }
});
// Logout and clear JWT cookie
router.get('/logout', (req, res) => {
  const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${LOGOUT_REDIRECT_URI}`;
  res.redirect(kakaoLogoutUrl);
});


// Final local logout route to clear JWT and session cookie
router.get('/final-logout', (req, res) => {
  res.clearCookie('jwt');
  res.clearCookie('connect.sid');
  req.session.destroy(err => {
     if (err) return res.status(500).json({ message: 'Logout error' });
     res.redirect('/index.html');
  });
});


module.exports = router;

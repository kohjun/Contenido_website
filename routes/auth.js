// routes/auth.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure this middleware is availabl
const User = require('../models/User');
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = 'https://www.contenido.kr/auth/final-logout'; 
const JWT_SECRET = process.env.JWT_SECRET || 'hR68lDjbrA';
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

      console.log('User Profile:', profile);

      // JWT 생성
      const token = jwt.sign(
        { id: profile._id, role: profile.role, displayName: profile.displayName, email: profile.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      // 추가 정보가 필요한 경우 추가 정보 입력 페이지로 리디렉션
      if (!profile.isAdditionalInfoComplete) {
        return res.redirect('/additional-user-info.html');
      }

      res.redirect('/events.html');
    } catch (error) {
      console.error('Error during user login:', error);
      res.redirect('/');
    }
  }
);

router.post('/additional-info', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 추가 정보 저장
    user.name = req.body.name;
    user.gender = req.body.gender;
    user.birthDate = req.body.birthDate;
    user.phonenumber = req.body.phonenumber;
    user.isAdditionalInfoComplete = true;

    await user.save();

    res.status(200).json({ message: '추가 정보가 성공적으로 저장되었습니다.', redirectUrl: '/events.html' });
  } catch (error) {
    console.error('Error saving additional info:', error);
    res.status(500).json({ message: '추가 정보를 저장하는 중 문제가 발생했습니다.' });
  }
});






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

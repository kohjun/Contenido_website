// routes/auth.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware'); 
const User = require('../models/User');
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = 'http://localhost:3000/auth/final-logout';   // 웹사이트 주소 입력
const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

// 카카오 로그인 초기화
router.get('/kakao', passport.authenticate('kakao'));

// JWT 토큰 생성 및 카카오 로그인 콜백 핸들링
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const profile = req.user;

      // 카카오에서 받은 토큰 저장
      const kakaoToken = {
        access_token: profile.kakaoAccessToken,
        refresh_token: profile.kakaoRefreshToken,
        expires_in: 5 * 60 * 60 * 1000 // 5시간
      };

      // 자체 JWT 토큰 생성
      const token = jwt.sign(
        { 
          id: profile._id, 
          role: profile.role, 
          displayName: profile.displayName, 
          email: profile.email,
          kakaoToken: kakaoToken // 카카오 토큰 정보 포함
        },
        JWT_SECRET,
        { expiresIn: '5h' }
      );

      // 쿠키에 토큰 저장
      res.cookie('jwt', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      });

      // 추가 정보 확인 및 리디렉션
      if (!profile.isAdditionalInfoComplete) {
        return res.redirect('/additional-user-info.html');
      }
      
      res.redirect('/'); // 메인 페이지로 리디렉션

    } catch (error) {
      console.error('Error during user login:', error);
      res.redirect('/');
    }
  }
);

// 회원가입 추가 정보 입력
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
    user.preferredActivity = req.body.preferredActivity;
    user.isAdditionalInfoComplete = true;

    await user.save();

    res.status(200).json({ 
      message: '추가 정보가 성공적으로 저장되었습니다.', 
      redirectUrl: '/index.html' 
    });
  } catch (error) {
    console.error('Error saving additional info:', error);
    res.status(500).json({ 
      message: '추가 정보를 저장하는 중 문제가 발생했습니다.',
      error: error.message 
    });
  }
});

// 사용자 역할 검증
router.get('/user-role', authenticateToken, (req, res) => {
  if (req.user) {
      res.json({ role: req.user.role });
  } else {
      res.status(401).json({ message: 'Unauthorized' });
  }
});

// 로그아웃 처리 수정
router.get('/logout', (req, res) => {
  // JWT 토큰만 제거
  res.clearCookie('jwt');
  
  // 세션 제거
  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    // 메인 페이지로 리디렉션
    res.redirect('/index.html');
  });
});

// 카카오 계정 완전 로그아웃 (선택적으로 사용)
router.get('/kakao-logout', (req, res) => {
  const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  res.redirect(kakaoLogoutUrl);
});

// 최종 로그아웃 처리 (카카오 로그아웃 후 호출됨)
router.get('/final-logout', (req, res) => {
  // JWT 토큰 제거
  res.clearCookie('jwt');
  res.redirect('/index.html');
});

module.exports = router;

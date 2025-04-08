const express = require('express');
const passport = require('passport');
const authenticateToken = require('../middleware/authMiddleware');
const TokenService = require('../utils/TokenService');
const User = require('../models/User');
const router = express.Router();

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = process.env.LOGOUT_REDIRECT_URI || 'http://localhost:3000/auth/final-logout';

// 카카오 로그인 초기화
router.get('/kakao', (req, res, next) => {
  const returnUrl = req.query.state || '/';
  passport.authenticate('kakao', {
    state: returnUrl,
    prompt: req.query.prompt || 'select_account',
    scope: ['profile_nickname', 'profile_image', 'account_email', 'openid']
  })(req, res, next);
});

// 카카오 로그인 콜백 처리
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const profile = req.user;
      const returnUrl = req.query.state || '/';

      // JWT 토큰 생성 및 저장
      const token = TokenService.createJwtToken(profile);
      res.cookie('jwt', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 43200000, // 12시간
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      });

      // 추가 정보 입력 필요 시 리다이렉션
      if (!profile.isAdditionalInfoComplete) {
        return res.redirect('/additional-user-info.html');
      }

      res.redirect(decodeURIComponent(returnUrl));
    } catch (error) {
      console.error('Login error:', error);
      res.redirect('/');
    }
  }
);

// 토큰 유효성 검사
router.get('/check-token', async (req, res) => {
  try {
    const isValid = await TokenService.verifyToken(req.cookies.jwt);
    res.json({ isValid });
  } catch (error) {
    console.error('Token check error:', error);
    res.json({ isValid: false });
  }
});

// 추가 정보 저장
router.post('/additional-info', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 필수 필드 검증
    const requiredFields = ['name', 'gender', 'birthDate', 'phonenumber', 'preferredActivity'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: '필수 정보가 누락되었습니다.',
        missingFields
      });
    }

    // 정보 업데이트
    Object.assign(user, {
      ...req.body,
      isAdditionalInfoComplete: true
    });

    await user.save();
    res.json({ 
      message: '추가 정보가 저장되었습니다.',
      redirectUrl: '/index.html'
    });

  } catch (error) {
    console.error('Additional info save error:', error);
    res.status(500).json({ 
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 사용자 역할 확인
router.get('/user-role', authenticateToken, (req, res) => {
  res.json({ role: req.user?.role || 'guest' });
});

// 일반 로그아웃 수정
router.get('/logout', authenticateToken, async (req, res) => {
  try {
    // 1. 데이터베이스에서 사용자의 토큰 정보 초기화
    const user = await User.findById(req.user.id);
    if (user) {
      user.kakaoAccessToken = undefined;
      user.kakaoRefreshToken = undefined;
      user.tokenExpiresAt = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
    }

    // 2. 카카오 로그아웃
    await fetch('https://kapi.kakao.com/v1/user/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.user.kakaoAccessToken}`
      }
    });

    // 3. 모든 쿠키 삭제
    res.clearCookie('jwt');
    res.clearCookie('connect.sid'); // 세션 쿠키

    // 4. 세션 삭제
    if (req.session) {
      req.session.destroy();
    }

    // 5. 클라이언트에 응답
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그아웃 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 카카오 연동 해제
router.get('/kakao-logout', (req, res) => {
  const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  res.redirect(kakaoLogoutUrl);
});

// 최종 로그아웃 처리
router.get('/final-logout', (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/index.html');
});

module.exports = router;
const express = require('express');
const passport = require('passport');
const authenticateToken = require('../middleware/authMiddleware');
const TokenService = require('../utils/TokenService');
const User = require('../models/User');
const router = express.Router();

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = process.env.LOGOUT_REDIRECT_URI || 'https://contenido.kr/auth/final-logout';

// 카카오 로그인 초기화
router.get('/kakao', (req, res, next) => {
  const returnUrl = req.query.state || '/';
  // console.log(`카카오 로그인 시작, 반환 URL: ${returnUrl}`);
  passport.authenticate('kakao', {
    state: returnUrl,
    prompt: req.query.prompt || 'select_account',
    scope: ['profile_nickname', 'profile_image', 'account_email', 'openid']
  })(req, res, next);
});

// URL을 HTTPS로 변경하는 헬퍼 함수 추가
function ensureHttps(url) {
  if (url && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// 카카오 로그인 콜백 처리
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const profile = req.user;
      const returnUrl = req.query.state || '/';

      // 프로필 이미지 URL을 HTTPS로 변환
      if (req.user && req.user.profileImage) {
        req.user.profileImage = ensureHttps(req.user.profileImage);
        await req.user.save();
      }

      // JWT 토큰 생성 및 저장 (사용자별)
      const token = TokenService.createJwtToken(profile);
      res.cookie('jwt', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.contenido.kr' : undefined,
        maxAge: 43200000
      });

      // 세션에 사용자별 ID 저장
      req.session.userId = profile._id.toString();

      if (!profile.isAdditionalInfoComplete) {
        return res.redirect('/additional-user-info.html');
      }

      res.redirect(decodeURIComponent(returnUrl));
    } catch (error) {
      console.error('로그인 에러:', error);
      res.redirect('/');
    }
  }
);

// 토큰 유효성 검사
router.get('/check-token', async (req, res) => {
  try {
    const token = req.cookies.jwt;
    // console.log('토큰 유효성 검사 요청');
    
    // 세션 ID와 토큰의 ID 비교
    if (req.session.userId) {
      let tokenUserId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        tokenUserId = decoded.id;
        
        if (tokenUserId !== req.session.userId) {
          // console.log(`토큰/세션 불일치: 토큰 ID ${tokenUserId}, 세션 ID ${req.session.userId}`);
          return res.json({ isValid: false, reason: 'session_mismatch' });
        }
      } catch (error) {
        console.log('토큰 디코딩 실패');
      }
    }
    
    const isValid = await TokenService.verifyToken(token);
    // console.log(`토큰 유효성 검사 결과: ${isValid}`);
    res.json({ isValid });
  } catch (error) {
    console.error('토큰 검사 에러:', error);
    res.json({ isValid: false, error: error.message });
  }
});

// 추가 정보 저장
router.post('/additional-info', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // console.log(`사용자 ${user._id}의 추가 정보 저장 시도`);

    // 필수 필드 검증
    const requiredFields = ['name', 'gender', 'birthDate', 'phonenumber', 'preferredActivity'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log(`필수 정보 누락: ${missingFields.join(', ')}`);
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
    // console.log(`사용자 ${user._id}의 추가 정보 저장 성공`);
    
    res.json({ 
      message: '추가 정보가 저장되었습니다.',
      redirectUrl: '/index.html'
    });

  } catch (error) {
    console.error('추가 정보 저장 에러:', error);
    res.status(500).json({ 
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 사용자 역할 확인
router.get('/user-role', authenticateToken, (req, res) => {
  // console.log(`사용자 ${req.user?.id} 역할 확인: ${req.user?.role || 'guest'}`);
  res.json({ role: req.user?.role || 'guest' });
});

// 일반 로그아웃 수정
router.get('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    // console.log(`사용자 ${userId} 로그아웃 시도`);
    
    // 1. 데이터베이스에서 사용자의 토큰 정보 초기화
    const user = await User.findById(userId);
    if (user) {
      user.kakaoAccessToken = undefined;
      user.kakaoRefreshToken = undefined;
      user.tokenExpiresAt = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
      // console.log(`사용자 ${userId}의 토큰 정보 초기화 완료`);
    }

    // 2. 카카오 로그아웃
    if (req.user?.kakaoAccessToken) {
      try {
        await fetch('https://kapi.kakao.com/v1/user/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${req.user.kakaoAccessToken}`
          }
        });
        // console.log(`사용자 ${userId}의 카카오 로그아웃 성공`);
      } catch (error) {
        console.error(`카카오 로그아웃 실패:`, error);
      }
    }

    // 3. 모든 쿠키 삭제
    res.clearCookie('jwt');
    res.clearCookie('connect.sid'); // 세션 쿠키
    // console.log('쿠키 삭제 완료');

    // 4. 세션 삭제
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('세션 삭제 실패:', err);
        // else console.log('세션 삭제 완료');
      });
    }

    // 5. 클라이언트에 응답
    res.json({ success: true });
  } catch (error) {
    console.error('로그아웃 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '로그아웃 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 카카오 연동 해제
router.get('/kakao-logout', (req, res) => {
  // console.log('카카오 연동 해제 시도');
  const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  res.redirect(kakaoLogoutUrl);
});

// 최종 로그아웃 처리
router.get('/final-logout', (req, res) => {
  // console.log('최종 로그아웃 처리');
  res.clearCookie('jwt');
  res.redirect('/index.html');
});

module.exports = router;

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

// 토큰 요청 대기열 관리를 위한 변수들
let tokenRequestQueue = [];
let isProcessing = false;
const TOKEN_RATE_LIMIT = 20; // 10분당 최대 토큰 발급 수
let tokenCount = 0;
let lastResetTime = Date.now();

// 토큰 발급 요청을 처리하는 함수
async function processTokenQueue() {
  if (isProcessing || tokenRequestQueue.length === 0) return;
  
  isProcessing = true;
  
  // 10분마다 토큰 카운트 초기화
  if (Date.now() - lastResetTime > 600000) {
    tokenCount = 0;
    lastResetTime = Date.now();
  }

  while (tokenRequestQueue.length > 0 && tokenCount < TOKEN_RATE_LIMIT) {
    const request = tokenRequestQueue.shift();
    try {
      tokenCount++;
      await request.resolve();
    } catch (error) {
      request.reject(error);
    }
  }

  isProcessing = false;
  
  // 대기열에 요청이 남아있으면 10분 후 다시 처리
  if (tokenRequestQueue.length > 0) {
    setTimeout(processTokenQueue, 600000);
  }
}

// 카카오 로그인 초기화 수정
router.get('/kakao', (req, res, next) => {
  // state 파라미터로 전달된 리턴 URL 저장
  const returnUrl = req.query.state || '/';
  
  passport.authenticate('kakao', {
    state: returnUrl
  })(req, res, next);
});

// JWT 토큰 생성 및 카카오 로그인 콜백 핸들링 수정
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const profile = req.user;
      const returnUrl = req.query.state || '/'; // state 파라미터에서 리턴 URL 가져오기

      // 카카오에서 받은 토큰 저장
      const kakaoToken = {
        access_token: profile.kakaoAccessToken,
        refresh_token: profile.kakaoRefreshToken,
        expires_in: 60 * 24 * 60 * 60 * 1000 // 60일
      };

      // JWT 토큰 생성 (1일 유효)
      const token = jwt.sign(
        { 
          id: profile._id, 
          role: profile.role, 
          email: profile.email 
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      // 쿠키에 토큰 저장
      res.cookie('jwt', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1일
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      });

      // 추가 정보 확인 및 리디렉션
      if (!profile.isAdditionalInfoComplete) {
        return res.redirect('/additional-user-info.html');
      }

      // 대기 상태 UI 제공
      if (tokenRequestQueue.length > 0) {
        const position = tokenRequestQueue.length;
        return res.send(`
          <html>
            <body>
              <h2>로그인 대기 중...</h2>
              <p>현재 대기 순서: ${position}번째</p>
              <p>예상 대기 시간: 약 ${Math.ceil(position / TOKEN_RATE_LIMIT * 10)}분</p>
              <script>
                setTimeout(() => { window.location.reload(); }, 30000);
              </script>
            </body>
          </html>
        `);
      }

      processTokenQueue();
      res.redirect(decodeURIComponent(returnUrl));
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

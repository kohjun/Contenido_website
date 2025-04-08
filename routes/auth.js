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

// 토큰 상태 확인 엔드포인트
router.get('/check-token', (req, res) => {
  const jwt = req.cookies.jwt;
  const refreshToken = req.cookies.refreshToken;
  
  if (!jwt) {
    return res.status(401).json({ message: 'No access token found' });
  }
  
  try {
    // JWT 토큰 검증
    const decoded = require('jsonwebtoken').verify(jwt, process.env.JWT_SECRET);
    return res.status(200).json({ message: 'Valid token', user: decoded });
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshToken) {
      // 토큰이 만료되었으나 리프레시 토큰이 있는 경우
      // 클라이언트가 /refresh-token 엔드포인트를 호출하도록 유도
      return res.status(401).json({ message: 'Token expired, refresh required' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// 리프레시 토큰을 사용한 액세스 토큰 갱신 엔드포인트
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token found' });
  }
  
  try {
    // 사용자 찾기
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // 리프레시 토큰 검증
    const isRefreshValid = await verifyRefreshToken(user);
    
    if (!isRefreshValid) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    
    // 토큰 재사용 감지 (선택적)
    if (user.lastRefreshTokenUse && 
        new Date() - user.lastRefreshTokenUse < 1000) { // 1초 이내 재사용
      await User.updateOne({ _id: user._id }, { 
        $unset: { refreshToken: 1, refreshTokenExpiry: 1 } 
      });
      return res.status(403).json({ message: 'Refresh token reuse detected' });
    }
    
    // 새 액세스 토큰 발급
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '6h' } // 6시간으로 연장
    );
    
    // 새 리프레시 토큰 발급 (선택적)
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '14d' } // 14일
    );
    
    // 사용자 정보 업데이트
    await saveRefreshToken(user._id, newRefreshToken);
    
    // 쿠키 설정
    res.cookie('jwt', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 6 * 60 * 60 * 1000 // 6시간
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14일
    });
    
    return res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Error refreshing token' });
  }
});
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
  (req, res, next) => {
    passport.authenticate('kakao', (err, user, info) => {
      if (err) {
        console.error('Kakao authentication error:', err);
        return res.redirect('/?error=auth_failed');
      }
      
      if (!user) {
        console.error('No user returned from Kakao auth:', info);
        return res.redirect('/?error=no_user');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.redirect('/?error=login_failed');
        }
        
        // 토큰 생성 및 쿠키 설정 코드...
        const accessToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '6h' }
        );

        const refreshToken = jwt.sign(
          { id: user._id },
          process.env.REFRESH_TOKEN_SECRET || 'refresh-secret',
          { expiresIn: '14d' }
        );

        // 쿠키 설정
        res.cookie('jwt', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 6 * 60 * 60 * 1000 // 6시간
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 14 * 24 * 60 * 60 * 1000 // 14일
        });
        
        const returnUrl = req.query.state || '/';
        res.redirect(decodeURIComponent(returnUrl));
      });
    })(req, res, next);
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
router.get('/logout', async (req, res) => {
  const user = req.user;
  if (user) {
    await User.updateOne({ _id: user._id }, {
      $unset: { refreshToken: 1, refreshTokenExpiry: 1 }
    });
  }
  
  res.clearCookie('jwt', { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  res.clearCookie('refreshToken', { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  
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

const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/authMiddleware');
const TokenService = require('../utils/TokenService');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
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

      // 프로필 이미지 URL을 HTTPS로 변환 (에러 처리 강화)
      try {
        if (req.user && req.user.profileImage) {
          const httpsUrl = ensureHttps(req.user.profileImage);
          if (httpsUrl !== req.user.profileImage) {
            req.user.profileImage = httpsUrl;
            await req.user.save();
          }
        }
      } catch (error) {
        console.error('프로필 이미지 업데이트 에러:', error);
        // 에러가 발생해도 로그인 플로우는 계속 진행
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
    
    // 세션 ID와 토큰의 ID 비교
    if (req.session.userId) {
      let tokenUserId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        tokenUserId = decoded.id;
        
        if (tokenUserId !== req.session.userId) {
          return res.json({ isValid: false, reason: 'session_mismatch' });
        }
      } catch (error) {
      }
    }
    
    const isValid = await TokenService.verifyToken(token);
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


    // 필수 필드 검증
    const requiredFields = ['name', 'gender', 'birthDate', 'phonenumber', 'preferredActivity'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: '필수 정보가 누락되었습니다.',
        missingFields
      });
    }

    // 전화번호 중복 검증 (본인 제외) 및 형식 검증
    const { phonenumber } = req.body;
    if (!/^[0-9]{10,11}$/.test(phonenumber)) {
      return res.status(400).json({ message: '유효하지 않은 전화번호 형식입니다.' });
    }
    const existingUser = await User.findOne({ phonenumber: phonenumber.trim(), _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(409).json({ message: '이미 등록된 전화번호입니다.' });
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
    console.error('추가 정보 저장 에러:', error);
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
    const userId = req.user?.id;
    
    // 1. 데이터베이스에서 사용자의 토큰 정보 초기화
    const user = await User.findById(userId);
    if (user) {
      user.kakaoAccessToken = undefined;
      user.kakaoRefreshToken = undefined;
      user.tokenExpiresAt = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
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
      } catch (error) {
        console.error(`카카오 로그아웃 실패:`, error);
      }
    }

    // 3. 모든 쿠키 삭제
    res.clearCookie('jwt');
    res.clearCookie('connect.sid'); // 세션 쿠키

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
  const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  res.redirect(kakaoLogoutUrl);
});

// 최종 로그아웃 처리
router.get('/final-logout', (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/index.html');
});

/* =====================================================================
   로컬 ID/PW 인증 (MongoDB User.passwordHash + bcrypt + JWT)
   - 이메일 = 아이디. 로컬 로그인 가능 = passwordHash 존재.
   - 카카오와 같은 User 문서를 공유(계정 연동) — §연동 라우트 참고.
   ===================================================================== */

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_MS = 43200000;                   // 12h
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;  // 30d
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;

// JWT 쿠키 옵션 (기존 카카오 콜백과 동일)
function jwtCookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.contenido.kr' : undefined,
    maxAge: maxAgeMs,
  };
}

// 로컬 JWT 발급 — payload 엔 식별자만 (role 등은 authMiddleware가 Mongo 에서 로드)
function issueAccessJwt(user) {
  return jwt.sign(
    { mongoUserId: user._id.toString(), provider: 'local' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// 회원가입 (로컬) — 이메일=아이디, bcrypt 해시는 Mongo User.passwordHash 에 저장
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: '유효한 이메일을 입력해주세요.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ message: '이름(닉네임)을 입력해주세요.' });
  }

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      displayName: displayName.trim(),
      passwordHash,
      role: 'guest',
      isVerified: true,
      isAdditionalInfoComplete: false,
    });

    const accessToken = issueAccessJwt(user);
    const refreshToken = await RefreshToken.issue(user._id, 30, req.headers['user-agent']);
    res.cookie('jwt', accessToken, jwtCookieOpts(ACCESS_MS));
    res.cookie('refreshToken', refreshToken, jwtCookieOpts(REFRESH_MS));
    req.session.userId = user._id.toString();

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      redirectUrl: '/additional-user-info.html',
    });
  } catch (error) {
    if (error && error.code === 11000) { // email unique 충돌
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    console.error('회원가입 에러:', error);
    res.status(500).json({ message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// 로그인 (로컬) — 이메일 + 비번. passwordHash 없는 계정(카카오 전용)은 비번 로그인 불가.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.warn(`[Login Fail] Empty email or password requested.`);
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockedUntil');
    if (!user) {
      console.warn(`[Login Fail] User not found for email: ${email}`);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (!user.passwordHash) {
      console.warn(`[Login Fail] Kakao-only user (no password hash) tried password login. Email: ${email}`);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.warn(`[Login Fail] Account currently locked for email: ${email}. Locked until: ${user.lockedUntil}`);
      return res.status(423).json({ message: '로그인 시도가 많아 잠시 잠겼습니다. 잠시 후 다시 시도해주세요.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: attempts };
      const isLocking = attempts >= LOCK_THRESHOLD;
      if (isLocking) {
        update.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      }
      await User.updateOne({ _id: user._id }, { $set: update });
      
      if (isLocking) {
        console.warn(`[Login Lock] Account locked for email: ${email} due to max attempts (${attempts}/${LOCK_THRESHOLD}). Locked until: ${update.lockedUntil}`);
      } else {
        console.warn(`[Login Fail] Incorrect password for email: ${email}. Attempt: ${attempts}/${LOCK_THRESHOLD}`);
      }
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 성공: 실패카운트/잠금 초기화 + lastLogin
    await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() } });

    const accessToken = issueAccessJwt(user);
    const refreshToken = await RefreshToken.issue(user._id, 30, req.headers['user-agent']);
    res.cookie('jwt', accessToken, jwtCookieOpts(ACCESS_MS));
    res.cookie('refreshToken', refreshToken, jwtCookieOpts(REFRESH_MS));
    req.session.userId = user._id.toString();

    console.log(`[Login Success] User logged in successfully. Email: ${email}`);

    res.json({
      success: true,
      message: '로그인되었습니다.',
      redirectUrl: user.isAdditionalInfoComplete ? '/events.html' : '/additional-user-info.html',
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 토큰 회전 (refresh → 새 access)
router.post('/refresh', async (req, res) => {
  try {
    const presented = req.cookies.refreshToken;
    const row = await RefreshToken.verifyToken(presented);
    if (!row) {
      return res.status(401).json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
    }
    const user = await User.findById(row.user);
    if (!user) {
      return res.status(401).json({ message: '유효하지 않은 세션입니다.' });
    }

    // 회전: 기존 폐기 + 신규 발급
    await RefreshToken.revokeToken(presented);
    const newRefresh = await RefreshToken.issue(user._id, 30, req.headers['user-agent']);
    const accessToken = issueAccessJwt(user);

    res.cookie('jwt', accessToken, jwtCookieOpts(ACCESS_MS));
    res.cookie('refreshToken', newRefresh, jwtCookieOpts(REFRESH_MS));
    res.json({ success: true });
  } catch (error) {
    console.error('토큰 갱신 에러:', error);
    res.status(500).json({ message: '토큰 갱신 중 오류가 발생했습니다.' });
  }
});

// 로컬 로그아웃 (refresh 폐기 + 쿠키/세션 정리) — 카카오 유저도 사용 가능
router.post('/logout', async (req, res) => {
  try {
    if (req.cookies.refreshToken) {
      await RefreshToken.revokeToken(req.cookies.refreshToken);
    }
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');
    res.clearCookie('connect.sid');
    if (req.session) {
      req.session.destroy(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error('로그아웃 에러:', error);
    res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
});

/* =====================================================================
   계정 연동 (하나의 User 가 카카오 + 로컬 로그인 둘 다 가질 수 있음)
   ===================================================================== */

// 연동 상태 (마이페이지에서 어떤 버튼을 보일지 결정)
router.get('/link-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash email kakaoId');
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ email: user.email, hasPassword: !!user.passwordHash, hasKakao: !!user.kakaoId });
  } catch (e) {
    console.error('연동 상태 조회 에러:', e);
    res.status(500).json({ message: '오류가 발생했습니다.' });
  }
});

// 비밀번호 설정/변경 — 카카오 유저가 이메일+비번 로그인을 연동(또는 비번 변경)
router.post('/link-password', authenticateToken, async (req, res) => {
  const { password, currentPassword } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

    const wasNew = !user.passwordHash;
    // 이미 비번이 있으면(변경) 현재 비번 확인
    if (!wasNew) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
      }
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({
      success: true,
      email: user.email,
      message: wasNew
        ? `비밀번호가 설정되었습니다. 이제 ${user.email} + 비밀번호로도 로그인할 수 있습니다.`
        : '비밀번호가 변경되었습니다.',
    });
  } catch (e) {
    console.error('비밀번호 연동 에러:', e);
    res.status(500).json({ message: '오류가 발생했습니다.' });
  }
});

// 카카오 연동 시작 — 로컬 유저가 로그인 상태에서 카카오 연동 (콜백은 기존 /kakao/callback 재사용)
router.get('/link-kakao', authenticateToken, (req, res, next) => {
  req.session.linkUserId = (req.user.id || req.user._id).toString();
  req.session.save(() => {
    passport.authenticate('kakao', {
      state: '/mypage.html?linked=kakao',
      scope: ['profile_nickname', 'profile_image', 'account_email', 'openid'],
    })(req, res, next);
  });
});

module.exports = router;

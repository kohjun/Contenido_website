// middleware/authMiddleware.js
// 인증 미들웨어 — AUTH_MODE 환경변수로 더미/실인증 전환
// ---------------------------------------------------------------------
//   AUTH_MODE=dummy (기본) → 하드코딩 더미 admin (개발용, 기존 동작 무변경)
//   AUTH_MODE=real         → JWT 쿠키 검증 → Mongo User 로드
// 로컬 JWT payload: { accountId, mongoUserId } / 카카오 JWT payload: { id, ... }
// ---------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 개발용 더미 admin (AUTH_MODE !== 'real' 일 때)
const DUMMY_USER = {
  _id: '673aed9a051a576b3e2285e1',
  id: '673aed9a051a576b3e2285e1',
  email: 'kohjunn@naver.com',
  displayName: '고 준',
  profileImage: 'https://img1.kakaocdn.net/thumb/R640x640.q70/?fname=http://t1.kakaocdn.net/account_images/default_profile.jpeg',
  role: 'admin',
  team: 'operationTeam',
  department: 'operation',
  isDepartmentHead: true,
  isActive: true,
  isAdditionalInfoComplete: true,
  name: '고준',
  phonenumber: '01022458697',
  gender: 'male',
  birthDate: new Date('2000-01-30'),
  preferredActivity: '노원구'
};

const authenticateToken = async (req, res, next) => {
  // ── 더미 모드 (기본): 기존 동작 그대로 ──
  if (process.env.AUTH_MODE !== 'real') {
    req.user = DUMMY_USER;
    if (req.session) req.session.userId = DUMMY_USER.id;
    return next();
  }

  // ── 실인증 모드: JWT 쿠키 검증 → Mongo User 로드 ──
  try {
    const token = req.cookies && req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.mongoUserId || decoded.id; // 로컬/카카오 JWT 모두 지원
    if (!userId) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    req.user = user;
    if (req.session) req.session.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
    }
    console.error('인증 에러:', error.name, error.message);
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

module.exports = authenticateToken;

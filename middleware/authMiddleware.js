// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 토큰 인증 미들웨어
 * JWT 토큰으로 인증을 처리하며, 토큰 만료 시 리프레시 토큰으로 갱신 시도
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 프록시 뒤에서의 HTTPS 체크를 위한 X-Forwarded-Proto 헤더 확인
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    // HTTPS 강제 (프로덕션 환경에서만)
    if (process.env.NODE_ENV === 'production' && !isSecure) {
      return res.status(403).json({ message: 'HTTPS required' });
    }

    const accessToken = req.cookies.jwt;
    const refreshToken = req.cookies.refreshToken;

    // 둘 다 없으면 인증 실패
    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // 액세스 토큰이 있는 경우
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        
        // 사용자 정보 조회
        const user = await User.findById(decoded.id);
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        
        req.user = user;
        return next();
      } catch (error) {
        // 토큰 만료 또는 유효하지 않은 경우, 리프레시 토큰으로 시도
        if ((error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') && refreshToken) {
          // 리프레시 토큰 처리는 아래에서 계속
        } else {
          // 디버깅용 로그
          console.log('JWT verification error:', error.name, error.message);
          return res.status(401).json({ message: 'Invalid token', error: error.name });
        }
      }
    }

    // 리프레시 토큰 처리
    if (refreshToken) {
      // refreshToken 필드를 선택하도록 명시
      const user = await User.findOne({ refreshToken }).select('+refreshToken +refreshTokenExpiry +lastRefreshTokenUse');
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // 리프레시 토큰 만료 체크
      if (!user.refreshTokenExpiry || new Date() > new Date(user.refreshTokenExpiry)) {
        return res.status(401).json({ message: 'Refresh token expired' });
      }

      // 토큰 재사용 감지 (선택적)
      if (user.lastRefreshTokenUse && 
          new Date() - new Date(user.lastRefreshTokenUse) < 1000) { // 1초 이내 재사용
        await User.updateOne({ _id: user._id }, { 
          $unset: { refreshToken: 1, refreshTokenExpiry: 1 } 
        });
        return res.status(403).json({ message: 'Refresh token reuse detected' });
      }

      // 새 액세스 토큰 발급
      const newAccessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '6h' } // 6시간
      );

      // 새 리프레시 토큰 발급 
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, // 폴백 추가
        { expiresIn: '14d' } // 14일
      );

      // 만료일 계산
      const refreshExpiry = new Date();
      refreshExpiry.setDate(refreshExpiry.getDate() + 14);

      // 사용자 정보 업데이트
      user.refreshToken = newRefreshToken;
      user.refreshTokenExpiry = refreshExpiry;
      user.lastRefreshTokenUse = new Date();
      await user.save();

      // 쿠키 설정
      res.cookie('jwt', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Cross-site 요청에서도 쿠키가 전송되도록 'lax'로 설정
        maxAge: 6 * 60 * 60 * 1000 // 6시간
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14일
      });

      req.user = user;
      return next();
    }

    // 여기까지 왔다면 인증 실패
    return res.status(401).json({ message: 'Authentication required' });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = authenticateToken;
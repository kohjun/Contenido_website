// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyRefreshToken, saveRefreshToken } = require('../config/passportConfig');

const authenticateToken = async (req, res, next) => {
  // HTTPS 강제
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(403).json({ message: 'HTTPS required' });
  }

  const accessToken = req.cookies.jwt;
  const refreshToken = req.cookies.refreshToken;

  // 액세스 토큰이 없고 리프레시 토큰도 없으면 인증 실패
  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // 액세스 토큰이 있는 경우
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      return next();

    } catch (error) {
      // 액세스 토큰이 만료되었거나 유효하지 않고, 리프레시 토큰이 있으면 갱신 시도
      if ((error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') && refreshToken) {
        // 계속 아래 리프레시 토큰 로직으로 진행
      } else {
        // 다른 오류이거나 리프레시 토큰이 없으면 인증 실패
        return res.status(401).json({ message: 'Invalid token' });
      }
    }
  }

  // 리프레시 토큰으로 인증 시도 (액세스 토큰이 없거나 만료된 경우)
  if (refreshToken) {
    try {
      const user = await User.findOne({ refreshToken });

      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

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
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 6 * 60 * 60 * 1000 // 6시간
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14일
      });

      req.user = user;
      return next();
    } catch (err) {
      console.error('Error refreshing token:', err);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  }

  // 이 지점까지 왔다면 인증 실패
  return res.status(401).json({ message: 'Authentication required' });
};

module.exports = authenticateToken;
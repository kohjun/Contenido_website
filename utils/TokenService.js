const jwt = require('jsonwebtoken');
const User = require('../models/User');

class TokenService {
  // JWT 토큰 생성
  static createJwtToken(user) {
    return jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
  }

  // 카카오 토큰 유효성 검사
  static async verifyKakaoToken(accessToken) {
    try {
      const response = await fetch('https://kapi.kakao.com/v1/user/access_token_info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // 카카오 액세스 토큰 갱신
  static async refreshAccessToken(user) {
    try {
      const response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.KAKAO_CLIENT_ID,
          refresh_token: user.kakaoRefreshToken
        })
      });

      const data = await response.json();
      if (!response.ok) return null;

      // 토큰 정보 업데이트
      user.kakaoAccessToken = data.access_token;
      user.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));
      
      if (data.refresh_token) {
        user.kakaoRefreshToken = data.refresh_token;
        user.refreshTokenExpiresAt = new Date(Date.now() + (data.refresh_token_expires_in * 1000));
      }

      await user.save();
      return user;
    } catch (error) {
      console.error('Error refreshing kakao token:', error);
      return null;
    }
  }

  // JWT 토큰 검증 메서드 추가
  static async verifyToken(token) {
    if (!token) return false;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');
      
      if (!user) return false;

      // 카카오 토큰도 유효한지 확인
      const isKakaoTokenValid = await this.verifyKakaoToken(user.kakaoAccessToken);
      if (!isKakaoTokenValid) {
        const refreshedUser = await this.refreshAccessToken(user);
        return !!refreshedUser;
      }

      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // 사용자 토큰 갱신
  static async refreshUserToken(req) {
    try {
      const user = await User.findOne({
        refreshTokenExpiresAt: { $gt: new Date() }
      }).select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');

      if (!user) return null;

      const refreshedUser = await this.refreshAccessToken(user);
      if (!refreshedUser) return null;

      const newToken = this.createJwtToken(refreshedUser);

      req.res.cookie('jwt', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 43200000,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      });

      return refreshedUser;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }
}

module.exports = TokenService;
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
      console.error('카카오 토큰 검증 에러:', error);
      return false;
    }
  }

  // 카카오 액세스 토큰 갱신
  static async refreshAccessToken(user) {
    try {
      // console.log(`사용자 ${user._id}의 카카오 토큰 갱신 시도`);
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
      if (!response.ok) {
        console.error('카카오 토큰 갱신 실패:', data);
        return null;
      }

      // 토큰 정보 업데이트
      user.kakaoAccessToken = data.access_token;
      user.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));
      
      if (data.refresh_token) {
        user.kakaoRefreshToken = data.refresh_token;
        user.refreshTokenExpiresAt = new Date(Date.now() + (data.refresh_token_expires_in * 1000));
      }

      await user.save();
      // console.log(`사용자 ${user._id}의 카카오 토큰 갱신 성공`);
      return user;
    } catch (error) {
      console.error('카카오 토큰 갱신 중 에러:', error);
      return null;
    }
  }

  // JWT 토큰 검증 메서드 수정
  static async verifyToken(token) {
    if (!token) return false;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log(`토큰에서 추출한 사용자 ID: ${decoded.id}`);
      
      const user = await User.findById(decoded.id)
        .select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');
      
      if (!user) {
        console.log(`ID ${decoded.id}에 해당하는 사용자가 없음`);
        return false;
      }

      // 카카오 토큰도 유효한지 확인
      const isKakaoTokenValid = await this.verifyKakaoToken(user.kakaoAccessToken);
      if (!isKakaoTokenValid) {
        console.log(`사용자 ${user._id}의 카카오 토큰이 만료됨, 토큰 갱신 시도`);
        const refreshedUser = await this.refreshAccessToken(user);
        return !!refreshedUser;
      }

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('JWT 토큰 만료됨');
      } else {
        console.error('토큰 검증 에러:', error);
      }
      return false;
    }
  }

  // 사용자 토큰 갱신 메서드 수정
  static async refreshUserToken(req) {
    try {
      // 쿠키에서 기존 토큰을 확인
      const token = req.cookies.jwt;
      if (!token) {
      // console.log('토큰이 없어 갱신 불가');
        return null;
      }
      
      // 토큰에서 사용자 ID 추출 (만료된 토큰이라도 payload는 확인 가능)
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        userId = decoded.id;
        // console.log(`만료된 토큰에서 추출한 사용자 ID: ${userId}`);
      } catch (error) {
        console.error('토큰 디코딩 에러:', error);
        return null;
      }
      
      // 특정 사용자의 토큰만 갱신
      const user = await User.findOne({
        _id: userId,
        refreshTokenExpiresAt: { $gt: new Date() }
      }).select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');
      
      if (!user) {
        console.log(`ID ${userId}에 해당하는 사용자가 없거나 리프레시 토큰이 만료됨`);
        return null;
      }
      
      // console.log(`사용자 ${userId}의 토큰 갱신 시도`);
      const refreshedUser = await this.refreshAccessToken(user);
      if (!refreshedUser) {
        console.log(`사용자 ${userId}의 토큰 갱신 실패`);
        return null;
      }

      const newToken = this.createJwtToken(refreshedUser);
      // console.log(`사용자 ${userId}의 새 JWT 토큰 생성 완료`);

      req.res.cookie('jwt', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 43200000, // 12시간
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      });

      return refreshedUser;
    } catch (error) {
      console.error('토큰 갱신 중 에러:', error);
      return null;
    }
  }
}

module.exports = TokenService;
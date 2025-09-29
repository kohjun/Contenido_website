const jwt = require('jsonwebtoken');
const User = require('../models/User');

class TokenService {
  // JWT 토큰 생성 - 사용자별 고유 식별자 추가
  static createJwtToken(user) {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        sessionId: user.sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
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

  // 카카오에서 최신 프로필 정보 가져오기
  static async fetchLatestProfile(accessToken) {
    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        return {
          displayName: profileData.kakao_account?.profile?.nickname,
          profileImage: profileData.kakao_account?.profile?.profile_image_url
        };
      }
    } catch (error) {
      console.error('프로필 정보 가져오기 에러:', error);
    }
    return null;
  }

  // URL을 HTTPS로 변경하는 헬퍼 함수
  static ensureHttps(url) {
    if (url && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  }

  // 사용자 프로필 정보 업데이트
  static async updateUserProfile(user) {
    try {
      const latestProfile = await this.fetchLatestProfile(user.kakaoAccessToken);
      
      if (latestProfile) {
        let hasChanges = false;
        
        // 프로필 이름 업데이트
        if (latestProfile.displayName && latestProfile.displayName !== user.displayName) {
          user.displayName = latestProfile.displayName;
          hasChanges = true;
        }
        
        // 프로필 이미지 업데이트
        if (latestProfile.profileImage) {
          const httpsUrl = this.ensureHttps(latestProfile.profileImage);
          if (httpsUrl !== user.profileImage) {
            user.profileImage = httpsUrl;
            hasChanges = true;
          }
        }
        
        // 변경사항이 있을 때만 저장
        if (hasChanges) {
          await user.save();
          console.log(`사용자 ${user._id}의 프로필 정보 업데이트 완료`);
        }
      }
      
      return user;
    } catch (error) {
      console.error('프로필 업데이트 에러:', error);
      return user; // 에러가 발생해도 기존 사용자 정보 반환
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
      
      // 토큰 갱신 후 프로필 정보도 업데이트
      const updatedUser = await this.updateUserProfile(user);
      
      return updatedUser;
    } catch (error) {
      console.error('카카오 토큰 갱신 중 에러:', error);
      return null;
    }
  }

  // JWT 토큰 검증 메서드 수정 - 프로필 동기화 포함
  static async verifyToken(token, sessionId) {
    if (!token) return false;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 세션 ID 검증
      if (decoded.sessionId !== sessionId) {
        console.log('세션 불일치');
        return false;
      }

      const user = await User.findById(decoded.id)
        .select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');
      
      if (!user) return false;

      // 카카오 토큰 유효성 검사
      const isKakaoTokenValid = await this.verifyKakaoToken(user.kakaoAccessToken);
      if (!isKakaoTokenValid) {
        const refreshedUser = await this.refreshAccessToken(user);
        return !!refreshedUser;
      } else {
        // 토큰이 유효하면 프로필 정보 업데이트 (주기적으로)
        const lastUpdated = user.updatedAt || user.createdAt;
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        // 1시간 이상 지났으면 프로필 정보 업데이트
        if (hoursSinceUpdate >= 1) {
          await this.updateUserProfile(user);
        }
      }

      return true;
    } catch (error) {
      console.error('토큰 검증 에러:', error);
      return false;
    }
  }

  // 사용자 토큰 갱신 메서드 수정
  static async refreshUserToken(req) {
    try {
      const token = req.cookies.jwt;
      if (!token) {
        return null;
      }
      
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        userId = decoded.id;
      } catch (error) {
        console.error('토큰 디코딩 에러:', error);
        return null;
      }
      
      const user = await User.findOne({
        _id: userId,
        refreshTokenExpiresAt: { $gt: new Date() }
      }).select('+kakaoAccessToken +kakaoRefreshToken +tokenExpiresAt +refreshTokenExpiresAt');
      
      if (!user) {
        console.log(`ID ${userId}에 해당하는 사용자가 없거나 리프레시 토큰이 만료됨`);
        return null;
      }
      
      const refreshedUser = await this.refreshAccessToken(user);
      if (!refreshedUser) {
        console.log(`사용자 ${userId}의 토큰 갱신 실패`);
        return null;
      }

      const newToken = this.createJwtToken(refreshedUser);

      req.res.cookie('jwt', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 43200000,
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

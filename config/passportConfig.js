// config/passportConfig.js
// 카카오 OAuth 전략 (MongoDB User 생성/조회)
// ---------------------------------------------------------------------
// 카카오 로그인 시 Mongo User 를 email 기준으로 생성/조회하고 토큰 갱신.
// authMiddleware 는 JWT 의 mongoUserId/id 로 Mongo User 를 로드하므로
// 카카오/로컬 모두 동일한 req.user 흐름을 탄다.
// ---------------------------------------------------------------------

require('dotenv').config();
const KakaoStrategy = require('passport-kakao').Strategy;
const User = require('../models/User');

const setupPassport = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        callbackURL: process.env.KAKAO_CALLBACK_URL,
        scope: ['profile_nickname', 'profile_image', 'account_email', 'openid'],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account?.email;
          const tokenExpiresIn = 43199; // 12시간

          // ── 계정 연동 흐름 (로그인 상태에서 카카오 연동) ──
          // /auth/link-kakao 가 req.session.linkUserId 를 세팅하고 카카오로 보낸다.
          if (req && req.session && req.session.linkUserId) {
            const linkUserId = req.session.linkUserId;
            delete req.session.linkUserId;
            const kid = String(profile.id);
            const taken = await User.findOne({ kakaoId: kid });
            if (taken && taken._id.toString() !== linkUserId.toString()) {
              // 만약 기존의 카카오 계정이 추가 정보 기입을 완료하지 않은 임시 계정이라면
              // 그 임시 계정을 삭제하고, 현재 이메일로 로그인된 계정에 이 카카오를 연동(병합)해 줍니다.
              if (!taken.isAdditionalInfoComplete) {
                console.log(`[Account Merge] Deleting incomplete Kakao user ${taken._id} to link kakaoId ${kid} with email user ${linkUserId}`);
                await User.deleteOne({ _id: taken._id });
              } else {
                return done(null, false, { message: '이미 다른 완성된 계정에 연동된 카카오입니다.' });
              }
            }
            const current = await User.findById(linkUserId);
            if (!current) return done(null, false, { message: '연동할 계정을 찾을 수 없습니다.' });
            current.kakaoId = kid;
            current.kakaoAccessToken = accessToken;
            current.kakaoRefreshToken = refreshToken;
            current.tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);
            current.lastLogin = new Date();
            await current.save();
            if (req.session) req.session.userId = current._id.toString();
            return done(null, current);
          }

          // 카카오의 진짜 식별자는 kakaoId(profile.id). 이메일은 바뀌거나 로컬과 다를 수 있으므로
          // kakaoId 우선 조회 → 없으면 email 폴백. (연동 시 이메일 불일치도 정상 처리)
          let user = await User.findOne({ kakaoId: String(profile.id) });
          if (!user && email) user = await User.findOne({ email });

          if (user) {
            // 기존 사용자: 토큰 갱신 (+ kakaoId 없으면 부착)
            user.kakaoAccessToken = accessToken;
            user.kakaoRefreshToken = refreshToken;
            user.tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);
            user.refreshTokenExpiresAt = new Date(Date.now() + 5184000 * 1000);
            user.lastLogin = new Date();
            if (!user.kakaoId && profile.id) user.kakaoId = String(profile.id);
            await user.save();
          } else {
            // 신규 사용자 — 생성엔 이메일 필요
            if (!email) {
              return done(null, false, { message: '카카오 계정에 이메일이 필요합니다.' });
            }
            user = await User.create({
              email,
              displayName: profile._json.properties?.nickname || email.split('@')[0],
              profileImage: profile._json.properties?.profile_image,
              kakaoId: String(profile.id),
              isVerified: true,
              role: 'guest',
              kakaoAccessToken: accessToken,
              kakaoRefreshToken: refreshToken,
              tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
              refreshTokenExpiresAt: new Date(Date.now() + 5184000 * 1000),
              lastLogin: new Date(),
            });
          }

          if (req.session) {
            req.session.userId = user._id.toString();
          }

          return done(null, user);
        } catch (err) {
          console.error('카카오 인증 에러:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id || user._id?.toString());
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

module.exports = { setupPassport };

// require('dotenv').config();
// const KakaoStrategy = require('passport-kakao').Strategy;
// const User = require('../models/User');

// const setupPassport = (passport) => {
//   passport.use(
//     new KakaoStrategy(
//       {
//         clientID: process.env.KAKAO_CLIENT_ID,
//         callbackURL: process.env.KAKAO_CALLBACK_URL,
//         scope: ['profile_nickname', 'profile_image', 'account_email', 'openid'],
//         passReqToCallback: true,
//       },
//       async (req, accessToken, refreshToken, profile, done) => {
//         try {
//           const email = profile._json.kakao_account?.email;
//           const tokenExpiresIn = 43199; // 12시간

//           if (!email) {
//             console.log('카카오 프로필에서 이메일을 가져올 수 없음');
//             return done(null, false, { message: '이메일이 필요합니다.' });
//           }

//           // console.log(`카카오 로그인 시도: ${email}`);
//           let user = await User.findOne({ email });

//           if (user) {
//             // console.log(`기존 사용자 ${user._id} 로그인`);
//             // 토큰 업데이트
//             user.kakaoAccessToken = accessToken;
//             user.kakaoRefreshToken = refreshToken;
//             user.tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);
//             user.refreshTokenExpiresAt = new Date(Date.now() + 5184000 * 1000);
//             user.lastLogin = new Date(); // 마지막 로그인 시간 업데이트
//             await user.save();
            
//             // 세션에 사용자 ID 저장
//             if (req.session) {
//               req.session.userId = user._id.toString();
//               // console.log(`세션에 사용자 ID 저장: ${req.session.userId}`);
//             }
            
//             return done(null, user);
//           }

//           // 신규 사용자 생성
//           // console.log(`새 사용자 생성: ${email}`);
//           user = await User.create({
//             email,
//             displayName: profile._json.properties.nickname,
//             profileImage: profile._json.properties.profile_image,
//             kakaoId: profile.id,
//             isVerified: true,
//             role: 'guest',
//             kakaoAccessToken: accessToken,
//             kakaoRefreshToken: refreshToken,
//             tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
//             refreshTokenExpiresAt: new Date(Date.now() + 5184000 * 1000),
//             lastLogin: new Date() // 최초 로그인 시간 설정
//           });
          
//           // 세션에 사용자 ID 저장
//           if (req.session) {
//             req.session.userId = user._id.toString();
//             // console.log(`세션에 신규 사용자 ID 저장: ${req.session.userId}`);
//           }
          
//           return done(null, user);
//         } catch (err) {
//           console.error('카카오 인증 에러:', err);
//           return done(err, null);
//         }
//       }
//     )
//   );

//   passport.serializeUser((user, done) => {
//     // console.log(`사용자 직렬화: ${user.id}`);
//     done(null, user.id);
//   });
  
//   passport.deserializeUser(async (id, done) => {
//     try {
//       // console.log(`사용자 역직렬화 시도: ${id}`);
//       const user = await User.findById(id);
//       if (!user) {
//         // console.log(`역직렬화 실패: 사용자 ID ${id}를 찾을 수 없음`);
//       } else {
//         // console.log(`사용자 ${id} 역직렬화 성공`);
//       }
//       done(null, user);
//     } catch (err) {
//       console.error(`사용자 역직렬화 에러: ${err.message}`);
//       done(err, null);
//     }
//   });
// };

// module.exports = { setupPassport };

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
          // 실제 사용자 정보를 사용한 더미 데이터
          const dummyUser = {
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
            preferredActivity: '노원구',
            kakaoAccessToken: accessToken,
            kakaoRefreshToken: refreshToken,
            tokenExpiresAt: new Date(Date.now() + 43199 * 1000),
            refreshTokenExpiresAt: new Date(Date.now() + 5184000 * 1000),
            lastLogin: new Date()
          };

          if (req.session) {
            req.session.userId = dummyUser.id;
          }

          return done(null, dummyUser);
        } catch (err) {
          console.error('카카오 인증 에러:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    const dummyUser = {
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
    done(null, dummyUser);
  });
};

module.exports = { setupPassport };
// 인증 모듈 — 실인증 (AUTH_MODE=real 일 때 백엔드와 연동, dummy 모드에서도 /user/info가 더미를 반환하므로 호환)
const AuthModule = {
    /** 토큰/세션 유효성 검사 (/user/info 200 여부) */
    verifyToken: async function() {
      try {
        const res = await fetch('/user/info', { credentials: 'include' });
        return res.ok;
      } catch (e) {
        return false;
      }
    },

    /** 로그인 페이지(/login.html)로 이동 — ID/PW + 카카오 둘 다 제공 */
    redirectToLogin: function(showAlert = true) {
      if (showAlert) {
        try { alert('로그인이 필요합니다.'); } catch (e) {}
      }
      window.location.href = '/login.html';
    },

    /** 로그인 페이지로 이동 (nav 로그인 버튼용) */
    goToLogin: function() {
      window.location.href = '/login.html';
    },

    /** 인증 확인 — 미인증이면 로그인 페이지로 리다이렉트 */
    checkAuthentication: async function() {
      const ok = await this.verifyToken();
      if (!ok) {
        this.redirectToLogin(false);
        return false;
      }
      return true;
    },

    /** 현재 로그인 사용자 정보 (/user/info) */
    loadUserInfo: async function() {
      try {
        const res = await fetch('/user/info', { credentials: 'include' });
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        console.error('사용자 정보 로드 실패:', e);
        return null;
      }
    },

    /** 로그아웃 — refresh 폐기 + 쿠키/세션 정리 후 로그인 페이지로 */
    logout: async function(redirect = true) {
      try {
        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {
        console.error('로그아웃 요청 실패:', e);
      }
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
      if (redirect) {
        window.location.href = '/login.html';
      }
      return true;
    },

    /** 카카오 로그인 시작 (현재 페이지로 복귀) */
    loginWithKakao: function() {
      const ret = encodeURIComponent(window.location.origin + '/events.html');
      window.location.href = '/auth/kakao?state=' + ret;
    }
  };

  
// public/js/utils/nav-injector.js

//인증 모듈 먼저 정의
// const AuthModule = {
//     /**
//      * 인증 토큰 유효성 검사
//      * @returns {Promise<boolean>} 토큰 유효 여부
//      */
//     verifyToken: async function() {
//       try {
//         console.log('토큰 유효성 검사');
//         const response = await fetch('/auth/check-token');
//         const data = await response.json();
        
//         if (!data.isValid) {
//           console.log('인증 토큰이 유효하지 않음');
          
//           if (data.reason === 'session_mismatch') {
//             console.log('세션과 토큰 불일치, 세션 초기화 필요');
//             // 세션 초기화를 위한 로그아웃 처리
//             await this.logout(false); // 페이지 리다이렉트 없이 로그아웃만 처리
//           }
          
//           return false;
//         }
//         console.log('토큰 유효성 확인 완료');
//         return true;
//       } catch (error) {
//         console.error('토큰 검증 실패:', error);
//         return false;
//       }
//     },
  
//     /**
//      * 로그인 필요 시 로그인 페이지로 리다이렉트
//      * @param {boolean} showAlert 알림 표시 여부 (선택사항, 기본값: true)
//      */
//     redirectToLogin: function(showAlert = true) {
//       if (showAlert) {
//         alert('로그인이 필요합니다.');
//       }
//       // 현재 URL을 state 파라미터로 전달하여 카카오 로그인으로 리디렉션
//       const currentUrl = encodeURIComponent(window.location.href);
//       window.location.href = `/auth/kakao?state=${currentUrl}`;
//     },
  
//     /**
//      * 인증 상태 확인 및 미인증 시 로그인 페이지로 리다이렉트
//      * @returns {Promise<boolean>} 인증 여부
//      */
//     checkAuthentication: async function() {
//       const isTokenValid = await this.verifyToken();
//       if (!isTokenValid) {
//         this.redirectToLogin();
//         return false;
//       }
//       return true;
//     },
  
//     /**
//      * 현재 로그인한 사용자 정보 로드
//      * @returns {Promise<Object|null>} 사용자 정보 객체 또는 실패 시 null
//      */
//     loadUserInfo: async function() {
//       try {
//         console.log('사용자 정보 로드 시도');
//         const response = await fetch('/user/info');
//         if (!response.ok) {
//           throw new Error('사용자 정보를 가져올 수 없습니다.');
//         }
        
//         const user = await response.json();
//         console.log(`로그인된 사용자: ${user.nickname}, ID: ${user.id}`);
//         return user;
//       } catch (error) {
//         console.error('사용자 정보 로드 실패:', error);
//         return null;
//       }
//     },
  
//     /**
//      * 사용자 로그아웃 처리
//      * @param {boolean} redirect 로그아웃 후 메인 페이지로 리다이렉트 여부 (선택사항, 기본값: true)
//      * @returns {Promise<boolean>} 로그아웃 성공 여부
//      */
//     logout: async function(redirect = true) {
//       try {
//         console.log('로그아웃 시도');
//         const response = await fetch('/auth/logout', {
//           method: 'GET',
//           credentials: 'include'
//         });
  
//         if (response.ok) {
//           // 로컬 스토리지/세션 스토리지 클리어
//           localStorage.clear();
//           sessionStorage.clear();
          
//           console.log('로그아웃 성공');
          
//           if (redirect) {
//             window.location.href = '/index.html';
//           }
//           return true;
//         } else {
//           console.error('로그아웃 실패');
//           if (redirect) {
//             alert('로그아웃 처리 중 오류가 발생했습니다.');
//           }
//           return false;
//         }
//       } catch (error) {
//         console.error('로그아웃 에러:', error);
//         if (redirect) {
//           alert('로그아웃 처리 중 오류가 발생했습니다.');
//         }
//         return false;
//       }
//     },
  
//     /**
//      * 카카오 로그인 실행
//      */
//     loginWithKakao: async function() {
//         try {
//           console.log('카카오 로그인 시도');
          
//           // 서버의 TokenService를 이용한 토큰 검증 요청
//           const response = await fetch('/auth/check-token', {
//             method: 'GET',
//             credentials: 'include', // 쿠키 포함
//             headers: {
//                 'Accept': 'application/json',
//                 'Content-Type': 'application/json'
//             }
//           });
      
//           const data = await response.json();
          
//           if (data.isValid) {
//             // 토큰이 유효하면 메인 페이지로 리디렉션
//             console.log('유효한 토큰이 있음, 메인 페이지로 이동');
//             window.location.href = '/';
//           } else {
//             // 토큰/세션 불일치 감지 시 로그아웃 처리 후 로그인
//             if (data.reason === 'session_mismatch') {
//               console.log('세션과 토큰 불일치 감지, 재로그인 필요');
//               // 로그아웃 처리 (리디렉션 없이)
//               await fetch('/auth/logout', {
//                 method: 'GET',
//                 credentials: 'include'
//               });
//             }
            
//             // 카카오 로그인으로 리디렉션
//             console.log('카카오 로그인으로 이동');
//             const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
//             window.location.href = `/auth/kakao?state=${currentUrl}`;
//           }
//         } catch (error) {
//           console.error('토큰 검증 실패:', error);
//           // 오류 발생 시 카카오 로그인으로 리디렉션
//           const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
//           window.location.href = `/auth/kakao?state=${currentUrl}`;
//         }
//       }
//   };






  // 다른 페이지에서 import할 수 있도록 전역 객체에 등록
  window.AuthModule = AuthModule;
  
  const navStyles = `
  .container {
      position: relative;
      width: 100%;
      max-width: 750px;
      margin: 0 auto;
      padding: 1rem;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      min-height: calc(100vh - 70px - 65px);
      box-sizing: border-box;
      padding-bottom: 60px;
      padding-top: 70px;
  }
  
  .sidebar {
      position: fixed;
      top: 0;
      left: -290px;
      width: 260px;
      height: 100%;
      background-color: white;
      box-shadow: 2px 0 16px rgba(15, 23, 42, 0.12);
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1001;
      padding: 56px 24px 24px;
      overflow-y: auto;
      box-sizing: border-box;
  }

  /* 닫기 버튼 (우상단) */
  .sidebar-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(10, 132, 254, 0.08);
      color: #0A84FE;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.18s ease, transform 0.18s ease;
  }
  .sidebar-close:hover {
      background: #0A84FE;
      color: #fff;
      transform: scale(1.05);
  }
  .sidebar-close:active { transform: scale(0.95); }

  /* 배경 dim (사이드바 열렸을 때) */
  .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 1000;
  }
  .sidebar.is-open ~ .sidebar-backdrop,
  body.sidebar-open .sidebar-backdrop {
      opacity: 1;
      pointer-events: auto;
  }

  .sidebar-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .sidebar h3 {
      font-size: 17px;
      margin: 18px 0 8px;
      font-weight: 700;
      color: #0A84FE;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 8px;
  }
  .sidebar h3::before {
      content: '';
      width: 3px;
      height: 16px;
      background: #0A84FE;
      border-radius: 2px;
  }

  .sidebar ul {
      list-style: none;
      padding: 0;
      margin: 4px 0 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
  }

  .sidebar li {
      margin: 0;
      font-size: 14.5px;
      padding-left: 11px;
  }

  .sidebar a {
      text-decoration: none;
      color: #0875E0 !important;
      transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
      display: inline-block;
      padding: 7px 12px;
      border-radius: 8px;
      font-weight: 500;
  }
  .sidebar a:hover {
      color: #ffffff !important;
      background-color: #0A84FE;
      transform: translateX(2px);
  }
  /* h3를 감싼 a는 padding/배경 제거 */
  .sidebar-content > a {
      padding: 0;
      background: none !important;
  }
  .sidebar-content > a:hover {
      background: none !important;
      transform: none;
  }
  .sidebar-content > a:hover h3 {
      color: #0875E0;
      opacity: 0.85;
  }

  @media (max-width: 480px) {
      .sidebar {
          width: min(82vw, 280px);
          padding: 56px 18px 20px;
      }
      .sidebar h3 { font-size: 16px; margin: 14px 0 6px; }
      .sidebar li { font-size: 14px; padding-left: 8px; }
      .sidebar a { padding: 8px 12px; }
  }
  
  .custom-top-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px;
      height: 64px;
      background-color: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(10, 132, 254, 0.08);
      box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
      z-index: 1000;
  }

  .top-right-actions {
      display: flex;
      align-items: center;
      gap: 6px;
  }

  .top-icon-btn {
      background: rgba(10, 132, 254, 0.08);
      color: #0A84FE;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background-color 0.18s ease, transform 0.18s ease;
  }
  .top-icon-btn:hover {
      background-color: rgba(10, 132, 254, 0.18);
      transform: scale(1.05);
  }
  .top-icon-btn:active {
      transform: scale(0.96);
  }
  .top-icon-btn .custom-nav-icon {
      font-size: 20px;
      line-height: 1;
  }

  /* ===== 알림 (종 + 뱃지 + 드롭다운) ===== */
  .notif-wrap { position: relative; display: inline-flex; }
  .notif-wrap .top-icon-btn { position: relative; }
  .notif-badge {
      position: absolute; top: -3px; right: -3px;
      min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box;
      background: #EF4444; color: #fff;
      font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
      border-radius: 999px; box-shadow: 0 0 0 2px #fff;
  }
  .notif-panel {
      position: absolute; top: calc(100% + 8px); right: 0;
      width: 320px; max-height: 440px; overflow-y: auto;
      background: #fff; border: 1px solid #E5E7EB; border-radius: 14px;
      box-shadow: 0 12px 32px rgba(15,23,42,0.16);
      display: none; z-index: 2000;
  }
  .notif-panel.show { display: block; }
  .notif-panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 13px 16px; border-bottom: 1px solid #F1F1F1;
      font-weight: 700; font-size: 0.92rem; color: #1F2937;
      position: sticky; top: 0; background: #fff;
  }
  .notif-readall { background: none; border: none; color: #0A84FE; font-size: 12px; font-weight: 600; cursor: pointer; }
  .notif-list { list-style: none; margin: 0; padding: 0; }
  .notif-item { padding: 12px 16px; border-bottom: 1px solid #F4F4F5; cursor: pointer; transition: background .15s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: #F8FAFC; }
  .notif-item.unread { background: rgba(10,132,254,0.06); }
  .notif-item.unread .notif-title { font-weight: 700; }
  .notif-title { font-size: 0.88rem; color: #1F2937; line-height: 1.4; }
  .notif-time { font-size: 11px; color: #9CA3AF; margin-top: 4px; }
  .notif-empty { padding: 32px 16px; text-align: center; color: #9CA3AF; font-size: 0.85rem; }
  /* 모바일: 화면에 잘리지 않도록 뷰포트 고정 시트로 — 상단 네비 아래 가로 꽉 채움 */
  @media (max-width: 480px) {
      .notif-panel {
          position: fixed;
          top: 66px; left: 12px; right: 12px;
          width: auto; max-width: none;
          max-height: calc(100vh - 84px);
          border-radius: 16px;
      }
  }

  /* (legacy) 옛 .toggle-btn은 더 이상 top nav에서 사용 안 함 */
  .toggle-btn {
      display: none;
  }

  .custom-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background-color: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      justify-content: space-around;
      align-items: center;
      border-top: 1px solid rgba(10, 132, 254, 0.08);
      box-shadow: 0 -2px 14px rgba(15, 23, 42, 0.05);
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom);
  }

  .custom-nav-button {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      position: relative;
      transition: transform 0.18s ease;
  }
  .custom-nav-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(10, 132, 254, 0.08);
      transition: transform 0.18s ease, background-color 0.18s ease;
      z-index: 0;
  }
  .custom-nav-button:hover::before {
      transform: translate(-50%, -50%) scale(1);
  }
  .custom-nav-button:active::before {
      background: rgba(10, 132, 254, 0.18);
  }
  .custom-nav-button:active .custom-nav-icon {
      transform: scale(0.92);
  }

  .custom-nav-icon {
      font-size: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
      transition: transform 0.18s ease;
      line-height: 1;
  }

  /* 하단 네비 메뉴(햄버거) — 3개 바를 가지런하게, 시그니처색(#0A84FE) 고정 */
  .custom-nav-icon--menu {
      width: 26px; height: 26px;
  }
  .custom-nav-icon--menu .hamburger {
      position: relative; display: block;
      width: 22px; height: 2.5px; border-radius: 2px;
      background: #0A84FE;
  }
  .custom-nav-icon--menu .hamburger::before,
  .custom-nav-icon--menu .hamburger::after {
      content: ''; position: absolute; left: 0;
      width: 22px; height: 2.5px; border-radius: 2px;
      background: #0A84FE;
  }
  .custom-nav-icon--menu .hamburger::before { top: -6.5px; }
  .custom-nav-icon--menu .hamburger::after  { top: 6.5px; }

  .custom-nav-icon img {
      width: 26px;
      height: 26px;
      object-fit: contain;
  }

  /* 텍스트 라벨 제거 — span은 더 이상 사용 안 함 (혹시 남아있어도 숨김) */
  .custom-nav-button span {
      display: none;
  }

  /* CONTENIDO 텍스트 로고 (왼쪽 상단) */
  .nav-title {
      font-family: 'GmarketSansMedium', sans-serif;
      font-size: 1.55rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #0A84FE;
      cursor: pointer;
      margin: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      line-height: 1;
      transition: transform 0.18s ease, opacity 0.18s ease;
  }
  .nav-title:hover {
      transform: scale(1.02);
      opacity: 0.85;
  }
  .nav-title:active {
      transform: scale(0.98);
  }
  @media (max-width: 768px) {
      .top-right-actions { gap: 24px; }
      .user-dropdown-button {
          padding: 6px 12px;
          font-size: 12px;
          max-width: 180px;
      }
      .user-dropdown-button > span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
      }
  }
  @media (max-width: 480px) {
      .nav-title { font-size: 1.15rem; letter-spacing: 0.03em; }
      .custom-top-nav { padding: 10px 10px; height: 60px; }
      .top-right-actions { gap: 20px; }
      .top-icon-btn { width: 32px; height: 32px; }
      .top-icon-btn .custom-nav-icon { font-size: 16px; }

      .user-dropdown-button {
          padding: 5px 10px;
          font-size: 11px;
          gap: 4px;
          max-width: 140px;
      }
      .user-dropdown-button > span:first-child {
          max-width: 110px;
      }
      .user-dropdown-button .arrow { font-size: 9px; }

      .user-dropdown-menu {
          min-width: 200px;
          max-width: calc(100vw - 24px);
      }
  }
  @media (max-width: 360px) {
      .nav-title { font-size: 1rem; }
      .top-right-actions { gap: 16px; }
      .top-icon-btn { width: 30px; height: 30px; }
      .user-dropdown-button > span:first-child {
          max-width: 90px;
      }
  }
  
  /* 로그인 영역 스타일 */
  .auth-area {
      position: static;
      display: flex;
      align-items: center;
      gap: 10px;
  }
  
  .login-button {
      padding: 8px 15px;
      background-color: #0A84FE;
      color: white;
      width: 100px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s;
  }
  
  .login-button:hover {
      background-color: #0875e0;
  }
  
  /* 드롭다운 관련 스타일 */
  .user-dropdown {
      position: relative;
      display: inline-block;
  }
  
  .user-dropdown-button {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 15px;
      background-color: #f8f9fa;
      color: #333;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
  }
  
  .user-dropdown-button:hover {
      background-color: #e9ecef;
      border-color: #0A84FE;
  }
  
  .user-dropdown-button .arrow {
      font-size: 10px;
      transition: transform 0.3s;
  }
  
  .user-dropdown-button.active .arrow {
      transform: rotate(180deg);
  }
  
  .user-dropdown-menu {
      position: absolute;
      top: calc(100% + 5px);
      right: 0;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 200px;
      display: none;
      z-index: 1002;
      overflow: hidden;
  }
  
  .user-dropdown-menu.show {
      display: block;
      animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
      from {
          opacity: 0;
          transform: translateY(-10px);
      }
      to {
          opacity: 1;
          transform: translateY(0);
      }
  }
  
  .user-dropdown-header {
      padding: 15px;
      border-bottom: 1px solid #eee;
      background-color: #f8f9fa;
  }
  
  .user-dropdown-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
  }
  
  .user-dropdown-stats {
      display: flex;
      gap: 15px;
      font-size: 13px;
      color: #666;
  }
  
  .stat-item {
      display: flex;
      align-items: center;
      gap: 5px;
  }
  
  .stat-label {
      color: #888;
  }
  
  .stat-value {
      font-weight: 600;
      color: #0A84FE;
  }
  
  .stat-value.warning {
      color: #dc3545;
  }
  
  .user-dropdown-actions {
      padding: 8px;
  }
  
  .dropdown-action-button {
      width: 100%;
      padding: 10px 15px;
      background: none;
      border: none;
      text-align: left;
      font-size: 14px;
      color: #333;
      cursor: pointer;
      border-radius: 8px;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
  }
  
  .dropdown-action-button:hover {
      background-color: #f8f9fa;
  }
  
  .dropdown-action-button.logout {
      color: #dc3545;
  }
  
  .dropdown-action-button.logout:hover {
      background-color: #fff5f5;
  }
  
  .user-info-nav {
      display: flex;
      align-items: center;
      gap: 10px;
  }
  
  .user-name {
      font-size: 14px;
      width:100px;
      font-weight: 500;
      color: #333;
  }
  
  .logout-button {
      padding: 5px 10px;
      background-color: #f1f1f1;
      color: #333;
      border: none;
      border-radius: 15px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.3s;
  }
  
  .logout-button:hover {
      background-color: #e0e0e0;
  }
  
  .ad-banner-wrapper {
      position: relative;
      width: 100%;
      height: 0;
      z-index: 999;
  }
  
  .ad-banner {
      position: fixed;
      top: 50%;
      width: 160px;
      height: 600px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      padding: 1rem;
      transform: translateY(-50%);
      -webkit-transform: translateY(-50%);
      -moz-transform: translateY(-50%);
      -ms-transform: translateY(-50%);
  }
  
  
  @media (max-width: 768px) {
      .custom-top-nav {
          padding: 10px;
      }
      
      .container {
          padding-top: 60px;
          padding-bottom: 55px;
      }
  
      .custom-nav-icon {
          font-size: 20px;
      }
      .custom-nav-icon img {
          width: 20px;
          height: 20px;
      }
      .custom-nav-button span {
          font-size: 11px;
      }
      .custom-bottom-nav {
          height: 55px;
      }
      .nav-title {
          margin-top: 0;
      }
      .toggle-btn {
          top: 0.5rem;
          left: 0.5rem;
          padding: 0.3rem;
          width: 40px;
          height: 35px;
      }
      
      .auth-area {
          flex-direction: row;
          align-items: center;
          height: 40px;
      }
      
      .login-button {
          padding: 6px 12px;
          width: auto;
          min-width: 70px;
          font-size: 13px;
          white-space: nowrap;
      }
      
      .user-dropdown-button {
          padding: 6px 12px;
          font-size: 13px;
      }
      
      .user-dropdown-menu {
          min-width: 180px;
      }
      
      .user-dropdown-name {
          font-size: 14px;
      }
      
      .user-dropdown-stats {
          font-size: 12px;
          gap: 10px;
      }
      
      .dropdown-action-button {
          font-size: 13px;
          padding: 8px 12px;
      }
  }
  `;
  
  // 사이드바 HTML
  const sidebarHTML = `
  <aside>
      <div id="sidebar" class="sidebar">
          <button class="sidebar-close" onclick="toggleSidebar()" aria-label="메뉴 닫기">×</button>
          <div class="sidebar-content">
              <a href="/office.html" id="staffPageLink"><h3>운영진 페이지</h3></a>
              <a><h3>동아리 활동</h3></a>
              <ul>
                  <li><a href="mypage.html">마이페이지</a></li>
                  <li><a href="events.html">진행중인 이벤트</a></li>
                  <li><a href="ended-events.html">종료된 이벤트</a></li>
                  <li><a href="/calendar.html">이벤트 캘린더</a></li>
                  <li><a href="/ranking">활동 랭킹</a></li>
                  <li><a href="/event-staff.html" id="staffPageLink">이벤트 관리(운영진 전용)</a></li>
                  <li><a href="community.html">커뮤니티 자유게시판</a></li>
              </ul>
              <a href="/rules.html"><h3>동아리회칙 및  메뉴얼</h3></a>
              <a href="/partnerships"><h3>협찬 및 제휴</h3></a>
          </div>
      </div>
      <div class="sidebar-backdrop" onclick="toggleSidebar()"></div>
  </aside>
  `;
  
  // 상단 네비게이션 HTML — 왼쪽: CONTENIDO 텍스트 / 오른쪽: 🔔 알림 + 유저 드롭다운
  const topNavHTML = `
  <nav class="custom-top-nav">
      <span class="nav-title" onclick="goHome()">CONTENIDO</span>
      <div class="top-right-actions">
          <div class="notif-wrap">
              <button class="top-icon-btn" onclick="handleNotifications(event)" aria-label="알림">
                  <i class="custom-nav-icon">🔔</i>
                  <span class="notif-badge" id="notif-badge" hidden>0</span>
              </button>
              <div class="notif-panel" id="notif-panel">
                  <div class="notif-panel-header">
                      <span>알림</span>
                      <button class="notif-readall" type="button" onclick="markAllNotificationsRead()">모두 읽음</button>
                  </div>
                  <ul class="notif-list" id="notif-list"></ul>
                  <div class="notif-empty" id="notif-empty" hidden>새 알림이 없습니다</div>
              </div>
          </div>
          <div class="auth-area" id="auth-area">
              <!-- 로그인 버튼 또는 드롭다운은 자바스크립트로 동적 삽입 -->
          </div>
      </div>
  </nav>
  `;

  // 하단 네비게이션 HTML — 토글(메뉴) + 홈 + 마이
  const bottomNavHTML = `
  <nav class="custom-bottom-nav">
      <button class="custom-nav-button" onclick="toggleSidebar()" aria-label="메뉴">
          <i class="custom-nav-icon custom-nav-icon--menu"><span class="hamburger"></span></i>
      </button>
      <button class="custom-nav-button" onclick="goHome()" aria-label="홈">
          <i class="custom-nav-icon"><img src="./images/Home.jpeg" alt=""></i>
      </button>
      <button class="custom-nav-button" onclick="handleMyPageClick(event)" aria-label="마이페이지">
          <i class="custom-nav-icon"><img src="./images/mypage.jpeg" alt=""></i>
      </button>
  </nav>
  `;
  
  
  
  // 드롭다운 토글 함수
  function toggleUserDropdown() {
      const button = document.querySelector('.user-dropdown-button');
      const menu = document.querySelector('.user-dropdown-menu');
      
      if (button && menu) {
          button.classList.toggle('active');
          menu.classList.toggle('show');
      }
  }
  
  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', function(event) {
      const dropdown = document.querySelector('.user-dropdown');
      if (dropdown && !dropdown.contains(event.target)) {
          const button = document.querySelector('.user-dropdown-button');
          const menu = document.querySelector('.user-dropdown-menu');
          if (button && menu) {
              button.classList.remove('active');
              menu.classList.remove('show');
          }
      }
      // 알림 패널 바깥 클릭 시 닫기
      const notifWrap = document.querySelector('.notif-wrap');
      const notifPanel = document.getElementById('notif-panel');
      if (notifWrap && notifPanel && !notifWrap.contains(event.target)) {
          notifPanel.classList.remove('show');
      }
  });
  
  // 인증 영역 업데이트 함수
  async function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    try {
      const response = await fetch('/user/info_database');
      
      if (response.status === 200) {
        // 로그인된 상태
        const userData = await response.json();
        
        // 정기참여 횟수와 경고횟수 (User 모델에서 가져옴)
        const regularAttendance = userData.participationCount?.regularCount || 0;
        const warningCount = userData.warningCount || 0;
        
        authArea.innerHTML = `
          <div class="user-dropdown">
            <button class="user-dropdown-button" onclick="toggleUserDropdown()">
              <span>${userData.name || userData.displayName || '회원'}</span>
              <span class="arrow">▼</span>
            </button>
            <div class="user-dropdown-menu">
              <div class="user-dropdown-header">
            <div class="user-dropdown-name">${userData.name || userData.displayName || '회원'}</div>
            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">역할 : ${
              userData.role === 'admin' ? '관리자' :
              userData.role === 'starter' ? '스타터' :
              userData.role === 'participant' ? '참가자' :
              userData.role === 'officer' ? '운영진' :
              userData.role
            }</div>
            
            <div class="user-dropdown-stats">
              <div class="stat-item">
            <span class="stat-label">정기참여</span>
            <span class="stat-value">${regularAttendance}회</span>
              </div>
              <div class="stat-item">
            <span class="stat-label">경고</span>
            <span class="stat-value ${warningCount > 0 ? 'warning' : ''}">${warningCount}회</span>
              </div>
            </div>
              </div>
              <div class="user-dropdown-actions">
            <button class="dropdown-action-button" onclick="goToMyPage()">
              
              <span>마이페이지</span>
            </button>
            <button class="dropdown-action-button logout" onclick="AuthModule.logout()">
            
              <span>로그아웃</span>
            </button>
              </div>
            </div>
          </div>
        `;
      } else {
        // 로그인되지 않은 상태
        authArea.innerHTML = `
          <button class="login-button" onclick="AuthModule.goToLogin()">로그인</button>
        `;
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      // 오류 시 로그인 버튼 표시
      authArea.innerHTML = `
        <button class="login-button" onclick="AuthModule.goToLogin()">로그인</button>
      `;
    }
  }
  
  // 마이페이지로 이동
  function goToMyPage() {
      window.location.href = '/mypage.html';
  }
  
  // 사이드바 토글 함수
  function toggleSidebar() {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
          const isOpen = sidebar.style.left === "0px";
          if (isOpen) {
              sidebar.style.left = "-290px";
              document.body.classList.remove("sidebar-open");
          } else {
              sidebar.style.left = "0px";
              document.body.classList.add("sidebar-open");
          }
      }
  }
  
  // ===== 알림 =====
  async function handleNotifications(e) {
      if (e) e.stopPropagation();
      
      const isLoggedIn = await AuthModule.verifyToken();
      if (!isLoggedIn) {
          AuthModule.redirectToLogin(false);
          return;
      }

      const panel = document.getElementById('notif-panel');
      if (!panel) return;
      const willOpen = !panel.classList.contains('show');
      panel.classList.toggle('show');
      if (willOpen) loadNotifications();
  }

  async function refreshNotifBadge() {
      try {
          const res = await fetch('/notifications/unread-count', { credentials: 'include' });
          if (!res.ok) return;
          const { count } = await res.json();
          const badge = document.getElementById('notif-badge');
          if (!badge) return;
          if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.hidden = false; }
          else { badge.hidden = true; }
      } catch (_) {}
  }

  function notifEscape(s) {
      return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function notifTimeAgo(d) {
      const t = new Date(d).getTime();
      if (isNaN(t)) return '';
      const diff = Math.floor((Date.now() - t) / 1000);
      if (diff < 60) return '방금';
      if (diff < 3600) return Math.floor(diff / 60) + '분 전';
      if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
      if (diff < 7 * 86400) return Math.floor(diff / 86400) + '일 전';
      return new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  async function loadNotifications() {
      const list = document.getElementById('notif-list');
      const empty = document.getElementById('notif-empty');
      if (!list) return;
      try {
          const res = await fetch('/notifications', { credentials: 'include' });
          if (!res.ok) return;
          const items = await res.json();
          list.innerHTML = '';
          if (empty) empty.hidden = items.length > 0;
          items.forEach(n => {
              const li = document.createElement('li');
              li.className = 'notif-item' + (n.isRead ? ' read' : ' unread');
              li.innerHTML = '<div class="notif-title">' + notifEscape(n.title) + '</div>' +
                             '<div class="notif-time">' + notifTimeAgo(n.createdAt) + '</div>';
              li.addEventListener('click', () => onNotificationClick(n));
              list.appendChild(li);
          });
      } catch (_) {}
  }

  async function onNotificationClick(n) {
      try {
          if (!n.isRead) {
              await fetch('/notifications/' + n._id + '/read', { method: 'POST', credentials: 'include' });
              refreshNotifBadge();
          }
      } catch (_) {}
      if (n.link) window.location.href = n.link;
  }

  async function markAllNotificationsRead() {
      try {
          await fetch('/notifications/read-all', { method: 'POST', credentials: 'include' });
          refreshNotifBadge();
          loadNotifications();
      } catch (_) {}
  }
  
  function goHome() {
      window.location.href = '/';
  }
  
  // 마이페이지 클릭 핸들러
  async function handleMyPageClick(event) {
    event.preventDefault();
    try {
      const response = await fetch('/user/info');
      if (!response.ok) {
          AuthModule.redirectToLogin(true);
          return;
      }
      window.location.href = '/mypage.html';
    } catch (error) {
      console.error('Error:', error);
      AuthModule.redirectToLogin(true);
    }
  }
  
  
  // 스타일과 네비게이션 삽입
  document.addEventListener('DOMContentLoaded', function() {
      // 스타일 삽입
      const styleSheet = document.createElement('style');
      styleSheet.textContent = navStyles;
      document.head.appendChild(styleSheet);
  
      // body에 사이드바 삽입
      document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  
      // 네비게이션 바 삽입
      const container = document.querySelector('.container');
      if (container) {
          container.insertAdjacentHTML('afterbegin', topNavHTML);
          container.insertAdjacentHTML('beforeend', bottomNavHTML);
          
          // 인증 영역 초기화
          updateAuthArea();

          // 알림 뱃지 (로드 시 + 60초 폴링)
          refreshNotifBadge();
          setInterval(refreshNotifBadge, 60 * 1000);
  
          // 현재 페이지에 따라 active 클래스 추가
          const currentPath = window.location.pathname;
          const buttons = document.querySelectorAll('.custom-nav-button');
          
          if (currentPath === '/') {
              buttons[1].classList.add('active');
          } else if (currentPath === '/mypage.html') {
              buttons[2].classList.add('active');
          }
      } else {
          console.error('Container element not found');
      }
  });
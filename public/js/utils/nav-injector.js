// 인증 모듈 먼저 정의
// const AuthModule = {
//     /**
//      * 인증 토큰 유효성 검사
//      * @returns {Promise<boolean>} 토큰 유효 여부
//      */
//     verifyToken: async function() {
//         // 개발용 - 항상 true 반환
//         return true;
//     },
  
//     /**
//      * 로그인 필요 시 로그인 페이지로 리다이렉트
//      * @param {boolean} showAlert 알림 표시 여부 (선택사항, 기본값: true)
//      */
//     redirectToLogin: function(showAlert = true) {
//         // 개발용 - 로그인 페이지로 리다이렉트하지 않고 항상 인증된 상태 유지
//         return true;
//     },
  
//     /**
//      * 인증 상태 확인 및 미인증 시 로그인 페이지로 리다이렉트
//      * @returns {Promise<boolean>} 인증 여부
//      */
//     checkAuthentication: async function() {
//         // 개발용 - 항상 true 반환
//         return true;
//     },
  
//     /**
//      * 현재 로그인한 사용자 정보 로드
//      * @returns {Promise<Object|null>} 사용자 정보 객체 또는 실패 시 null
//      */
//     loadUserInfo: async function() {
//         // 개발용 더미 유저 정보 반환
//         return {
//             _id: '673aed9a051a576b3e2285e1',
//             id: '673aed9a051a576b3e2285e1',
//             email: 'kohjunn@naver.com',
//             nickname: '고 준',
//             displayName: '고 준',
//             profileImage: 'https://img1.kakaocdn.net/thumb/R640x640.q70/?fname=http://t1.kakaocdn.net/account_images/default_profile.jpeg',
//             role: 'admin',
//             team: 'operationTeam',
//             department: 'operation',
//             isDepartmentHead: true,
//             isActive: true,
//             isAdditionalInfoComplete: true,
//             name: '고준',
//             phonenumber: '01022458697',
//             gender: 'male',
//             birthDate: new Date('2000-01-30'),
//             preferredActivity: '노원구'
//         };
//     },
  
//     /**
//      * 사용자 로그아웃 처리
//      * @param {boolean} redirect 로그아웃 후 메인 페이지로 리다이렉트 여부 (선택사항, 기본값: true)
//      * @returns {Promise<boolean>} 로그아웃 성공 여부
//      */
//     logout: async function(redirect = true) {
//       if (redirect) {
//         window.location.href = '/';
//       }
//       return true;
//     },
  
//     /**
//      * 카카오 로그인 실행
//      */
//     loginWithKakao: async function() {
//         // 개발용 - 즉시 홈페이지로 리다이렉트
//         window.location.href = '/';
//     }
//   };

  
// public/js/utils/nav-injector.js

// 인증 모듈 먼저 정의
const AuthModule = {
    /**
     * 인증 토큰 유효성 검사
     * @returns {Promise<boolean>} 토큰 유효 여부
     */
    verifyToken: async function() {
      try {
        console.log('토큰 유효성 검사');
        const response = await fetch('/auth/check-token');
        const data = await response.json();
        
        if (!data.isValid) {
          console.log('인증 토큰이 유효하지 않음');
          
          if (data.reason === 'session_mismatch') {
            console.log('세션과 토큰 불일치, 세션 초기화 필요');
            // 세션 초기화를 위한 로그아웃 처리
            await this.logout(false); // 페이지 리다이렉트 없이 로그아웃만 처리
          }
          
          return false;
        }
        console.log('토큰 유효성 확인 완료');
        return true;
      } catch (error) {
        console.error('토큰 검증 실패:', error);
        return false;
      }
    },
  
    /**
     * 로그인 필요 시 로그인 페이지로 리다이렉트
     * @param {boolean} showAlert 알림 표시 여부 (선택사항, 기본값: true)
     */
    redirectToLogin: function(showAlert = true) {
      if (showAlert) {
        alert('로그인이 필요합니다.');
      }
      // 현재 URL을 state 파라미터로 전달하여 카카오 로그인으로 리디렉션
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `/auth/kakao?state=${currentUrl}`;
    },
  
    /**
     * 인증 상태 확인 및 미인증 시 로그인 페이지로 리다이렉트
     * @returns {Promise<boolean>} 인증 여부
     */
    checkAuthentication: async function() {
      const isTokenValid = await this.verifyToken();
      if (!isTokenValid) {
        this.redirectToLogin();
        return false;
      }
      return true;
    },
  
    /**
     * 현재 로그인한 사용자 정보 로드
     * @returns {Promise<Object|null>} 사용자 정보 객체 또는 실패 시 null
     */
    loadUserInfo: async function() {
      try {
        console.log('사용자 정보 로드 시도');
        const response = await fetch('/user/info');
        if (!response.ok) {
          throw new Error('사용자 정보를 가져올 수 없습니다.');
        }
        
        const user = await response.json();
        console.log(`로그인된 사용자: ${user.nickname}, ID: ${user.id}`);
        return user;
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        return null;
      }
    },
  
    /**
     * 사용자 로그아웃 처리
     * @param {boolean} redirect 로그아웃 후 메인 페이지로 리다이렉트 여부 (선택사항, 기본값: true)
     * @returns {Promise<boolean>} 로그아웃 성공 여부
     */
    logout: async function(redirect = true) {
      try {
        console.log('로그아웃 시도');
        const response = await fetch('/auth/logout', {
          method: 'GET',
          credentials: 'include'
        });
  
        if (response.ok) {
          // 로컬 스토리지/세션 스토리지 클리어
          localStorage.clear();
          sessionStorage.clear();
          
          console.log('로그아웃 성공');
          
          if (redirect) {
            window.location.href = '/index.html';
          }
          return true;
        } else {
          console.error('로그아웃 실패');
          if (redirect) {
            alert('로그아웃 처리 중 오류가 발생했습니다.');
          }
          return false;
        }
      } catch (error) {
        console.error('로그아웃 에러:', error);
        if (redirect) {
          alert('로그아웃 처리 중 오류가 발생했습니다.');
        }
        return false;
      }
    },
  
    /**
     * 카카오 로그인 실행
     */
    loginWithKakao: async function() {
        try {
          console.log('카카오 로그인 시도');
          
          // 서버의 TokenService를 이용한 토큰 검증 요청
          const response = await fetch('/auth/check-token', {
            method: 'GET',
            credentials: 'include', // 쿠키 포함
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
          });
      
          const data = await response.json();
          
          if (data.isValid) {
            // 토큰이 유효하면 메인 페이지로 리디렉션
            console.log('유효한 토큰이 있음, 메인 페이지로 이동');
            window.location.href = '/';
          } else {
            // 토큰/세션 불일치 감지 시 로그아웃 처리 후 로그인
            if (data.reason === 'session_mismatch') {
              console.log('세션과 토큰 불일치 감지, 재로그인 필요');
              // 로그아웃 처리 (리디렉션 없이)
              await fetch('/auth/logout', {
                method: 'GET',
                credentials: 'include'
              });
            }
            
            // 카카오 로그인으로 리디렉션
            console.log('카카오 로그인으로 이동');
            const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/auth/kakao?state=${currentUrl}`;
          }
        } catch (error) {
          console.error('토큰 검증 실패:', error);
          // 오류 발생 시 카카오 로그인으로 리디렉션
          const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/auth/kakao?state=${currentUrl}`;
        }
      }
  };






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
      left: -280px;
      width: 230px;
      height: 100%;
      background-color: white;
      box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
      transition: left 0.3s ease;
      z-index: 1001;
      padding-left: 30px;
  }
  
  .sidebar h3 {
      font-size: 20px;
      margin: 25px 0;
      font-weight: 500;
      color: rgba(0, 0, 0, 1);
  }
  
  .sidebar ul {
      list-style: none;
      padding-left: 25px;
      margin: 20px 0;
  }
  
  .sidebar li {
      margin: 15px 0;
      font-size: 16px;
  }
  
  .sidebar a {
      text-decoration: none;
      color: #333 !important;
      transition: color 0.2s;
  }
  
  .custom-top-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      padding: 15px;
      background-color: white;
      border-bottom: 1px solid #eee;
      z-index: 1000;
  }
  
  .toggle-btn {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: #fff;
      color: #0A84FE;
      padding: 0.5rem;
      font-size: 1.5rem;
      border: none;
      width: 50px;
      height: 40px;
      cursor: pointer;
      z-index: 1001;
      transition: background-color 0.3s ease, transform 0.2s ease;
  }
  
  .toggle-btn:hover {
      background-color: #0A84FE;
      transform: scale(1.05);
  }
  
  .custom-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 65px;
      background-color: white;
      display: flex;
      justify-content: space-around;
      align-items: center;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
  }
  
  .custom-nav-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 33.33%;
      height: 100%;
      border: none;
      background: none;
      padding: 8px 0;
      cursor: pointer;
      transition: background-color 0.2s;
  }
  .custom-nav-button:hover{
      background-color: transparent
  }
  .custom-nav-icon {
      font-size: 24px;
      margin-bottom: 4px;
  }
  
  .custom-nav-icon img {
      width: 24px;
      height: 24px;
  }
  
  .custom-nav-button span {
      font-size: 12px;
      color: #333;
  }
  
  .nav-title {
      font-family: 'GmarketSansMedium', sans-serif;
      font-size: 1.5rem;
      margin: 0 auto;
      margin-top: -10px; /* 위치를 조금 위로 올림 */
      color: #0A84FE;
      cursor: pointer;
      width: 200px;
      height: 40px;
  }
  
  .nav-title img {
      width: 100%;
      height: auto;
  }
  
  /* 로그인 영역 스타일 */
  .auth-area {
      position: absolute;
      right: 1rem;
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
  
  .left-banner {
      left: calc((100% - 850px) / 2 - 180px);
  }
  
  .right-banner {
      right: calc((100% - 850px) / 2 - 180px);
  }
  
  .ad-banner img {
      width: 100%;
      height: auto;
      border-radius: 8px;
  }
  
  @media (max-width: 1700px) {  /* 반응형 breakpoint 수정 */
      .ad-banner {
          display: none;
      }
  }
  
  @media (max-width: 768px) {
      .custom-top-nav {
          padding: 10px;
      }
      
      .container {
          padding-top: 60px; /* 모바일에서 상단 여백 조정 */
          padding-bottom: 55px; /* 모바일에서 하단 여백 조정 */
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
          right: 0.5rem;
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
      
      .user-info-nav {
          flex-direction: row;
          align-items: center;
          gap: 5px;
      }
      
      .user-name {
          font-size: 12px;
          max-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      .logout-button {
          padding: 4px 8px;
          font-size: 11px;
          white-space: nowrap;
      }
  }
  `;
  
  // 사이드바 HTML
  const sidebarHTML = `
  <aside>
      <div id="sidebar" class="sidebar">
          <div>
              <a href="/office.html" id="staffPageLink"><h3>운영진 페이지</h3></a>
              <a><h3>동아리 활동</h3></a>
              <ul>         
                  <li><a href="mypage.html">마이페이지</a></li>
                  <li><a href="events.html">진행중인 이벤트</a></li>
                  <li><a href="ended-events.html">종료된 이벤트</a></li>
                  <li><a href="/calendar.html">이벤트 캘린더</a></li>
                  <li><a href="/ranking">활동 랭킹</a></li>
                  <li><a href="/event-staff.html" id="staffPageLink">이벤트 관리(운영진 전용)</a></li>
                  <li><a href="">익명제보(예정)</a></li>
              </ul>
              <a href="/apply"><h3>신입부원 지원하기</h3></a>
              <a href="/rules.html"><h3>동아리회칙 및  메뉴얼</h3></a>
              <a href="" onclick="alert('추후 확장 예정입니다!')"><h3>회비내역(예정)</h3></a>
              <a href=""><h3>협찬 및 제휴</h3></a>
          </div>
      </div>
  </aside>
  `;
  
  // 상단 네비게이션 HTML - 로그인 버튼 추가
  const topNavHTML = `
  <nav class="custom-top-nav">
      <button id="toggle-btn" class="toggle-btn" onclick="toggleSidebar()">☰</button>
      <span class="nav-title" onclick="goHome()"><img src="./images/HomeLogo.png" alt="Contenido Logo"></span>
      <div class="auth-area" id="auth-area">
          <!-- 로그인 버튼 또는 사용자 정보는 자바스크립트로 동적 삽입 -->
      </div>
  </nav>
  `;
  
  // 하단 네비게이션 HTML
  const bottomNavHTML = `
  <nav class="custom-bottom-nav">
      <button class="custom-nav-button" onclick="handleNotifications()">
          <i class="custom-nav-icon">🔔</i>
          <span>알림</span>
      </button>
      <button class="custom-nav-button" onclick="goHome()">
          <i class="custom-nav-icon"><img src="./images/Home.jpeg"></i>
          <span>홈</span>
      </button>
      <button class="custom-nav-button" onclick="handleMyPageClick(event)">
          <i class="custom-nav-icon"><img src="./images/mypage.jpeg"></i>
          <span>마이</span>
      </button>
  </nav>
  `;
  // 광고 배너 HTML 수정
  const adBannersHTML = `
      <div class="ad-banner-wrapper">
          <div class="ad-banner left-banner">
              Contenid-o              
          </div>
          <div class="ad-banner right-banner">
             Contenid-o
          </div>
      </div>
  `;
  
  // 인증 영역 업데이트 함수
  async function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    try {
      const response = await fetch('/user/info');
      
      if (response.status === 200) {
        // 로그인된 상태
        const userData = await response.json();
        
        authArea.innerHTML = `
          <div class="user-info-nav">
            <span class="user-name">${userData.nickname}</span>
            <button class="logout-button" onclick="AuthModule.logout()">로그아웃</button>
          </div>
        `;
      } else {
        // 로그인되지 않은 상태
        authArea.innerHTML = `
          <button class="login-button" onclick="AuthModule.loginWithKakao()">로그인</button>
        `;
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      // 오류 시 로그인 버튼 표시
      authArea.innerHTML = `
        <button class="login-button" onclick="AuthModule.loginWithKakao()">로그인</button>
      `;
    }
  }
  
  // 사이드바 토글 함수
  function toggleSidebar() {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
          if (sidebar.style.left === "0px") {
              sidebar.style.left = "-250px";
          } else {
              sidebar.style.left = "0px";
          }
      }
  }
  
  // 네비게이션 함수들
  function handleNotifications() {
      alert('추후 확장예정입니다.')
  }
  
  function goHome() {
      window.location.href = '/';
  }
  
  // 마이페이지 클릭 핸들러 추가
  async function handleMyPageClick(event) {
    event.preventDefault();
    try {
      const response = await fetch('/user/info');
      if (!response.ok) {
        // 로그인이 필요한 경우
        AuthModule.redirectToLogin(true);
        return;
      }
      // 이미 로그인된 경우
      window.location.href = '/mypage.html';
    } catch (error) {
      console.error('Error:', error);
      AuthModule.redirectToLogin(true);
    }
  }
  
  // 광고 배너 삽입
  document.body.insertAdjacentHTML('beforeend', adBannersHTML);
  
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

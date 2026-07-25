const Sidebar = (function() {
  const template = `
    <div class="org-sidebar" id="org-sidebar">
      <div class="org-header">
        <a href="index.html"> <h1>CONTENIDO</h1> </a>
      </div>
      
      <div class="org-menu">
        <!-- 운영부 -->
        <a href="#" class="org-menu-item">
          <i>⚙️</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">운영부</div>
            <div class="org-menu-item-description">조직 운영 및 관리</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item" data-team="operationTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>운영팀</strong></div>
              <div class="org-menu-item-description">부서간 소통 및 일정 관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="cooperationTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>대외협력팀</strong></div>
              <div class="org-menu-item-description">기업협찬, 수료증, 활동증명</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="HumanResourceTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>인사팀</strong></div>
              <div class="org-menu-item-description">인사 규칙 및 입출관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="financeTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>재무팀</strong></div>
              <div class="org-menu-item-description">정산, 입출금 결제내역 관리</div>
            </div>
          </a>
        </div>

        <!-- 홍보부 -->
        <a href="#" class="org-menu-item">
          <i>📣</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">홍보부</div>
            <div class="org-menu-item-description">대외 홍보 및 동아리 모집</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item" data-team="marketingTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>홍보팀</strong></div>
              <div class="org-menu-item-description">동아리 모집, 인스타, 서포터즈 관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="designTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>디자인팀</strong></div>
              <div class="org-menu-item-description">포스터, 로고, UX/UI 디자인</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="videoTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>영상제작팀</strong></div>
              <div class="org-menu-item-description">이벤트, 정기모임 등 영상 관리</div>
            </div>
          </a>
        </div>

        <!-- 기획부 -->
        <a href="#" class="org-menu-item">
          <i>💡</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">기획부</div>
            <div class="org-menu-item-description">이벤트 및 정기모임 기획</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item" data-team="planningTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>기획팀</strong></div>
              <div class="org-menu-item-description">기획 활동 기록 및 일정 관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="regularTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>정기모임팀</strong></div>
              <div class="org-menu-item-description">조별활동, MT, 시즌 행사 기획</div>
            </div>
          </a>
          <a href="#" class="org-menu-item" data-team="staffTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>스태프팀</strong></div>
              <div class="org-menu-item-description">메인 컨텐츠 이벤트 기획</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  `;

  // 팀별 페이지 설정
  const pageConfigs = {
    operationTeam: { url: '/office_operation.html' },
    cooperationTeam: { url: '/office_cooperation.html' },
    HumanResourceTeam: { url: '/office_hr.html' },
    financeTeam: { url: '/office_finance.html' },
    marketingTeam: { url: '/office_marketing.html' },
    designTeam: { url: '/office_design.html' },
    videoTeam: { url: '/office_video.html' },
    planningTeam: { url: '/office_planning.html' },
    regularTeam: { url: '/calendar.html' },
    staffTeam: { url: '/office_staff.html' },
    announcement: { url: '/office_announcement.html' }  // Add this line
  };

  const departmentTeams = {
    operation: ['operationTeam', 'cooperationTeam', 'HumanResourceTeam', 'financeTeam'],
    promotion: ['marketingTeam', 'designTeam', 'videoTeam'],
    planning: ['planningTeam', 'regularTeam', 'staffTeam']
  };

  // 현재 사용자의 권한 정보를 가져오는 함수
  async function getCurrentUserRole() {
    try {
      const response = await fetch('/user/info');
      const userData = await response.json();
      return {
        role: userData.role,
        department: userData.department,
        team: userData.team,
        isDepartmentHead: userData.isDepartmentHead
      };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  // 사용자의 페이지 접근 권한을 확인하는 함수
  function hasAccessToPage(userRole, teamId) {
    if (!userRole) return false;
    
    // 1. 관리자는 모든 접근 가능
    if (userRole.role === 'admin') return true;
    
    // 2. 부장은 자신의 부서의 모든 팀 페이지에 접근 가능
    if (userRole.isDepartmentHead) {
      return departmentTeams[userRole.department]?.includes(teamId);
    }
    
    // 3. 일반 팀원은 자신의 팀 페이지만 접근 가능
    return userRole.team === teamId;
  }

  // 페이지 로드 함수
  async function loadPage(pageId) {
    try {
      const userRole = await getCurrentUserRole();

      if (!hasAccessToPage(userRole, pageId)) {
        alert('접근 권한이 없습니다. 부장이거나 해당 팀 소속인 경우에만 접근할 수 있습니다.');
        return;
      }

      const pageConfig = pageConfigs[pageId];
      if (!pageConfig) {
        alert('페이지 구성을 찾을 수 없습니다.');
        return;
      }

      

      // 기존 페이지 로드 로직
      const mainContent = document.getElementById('main-content');
      const response = await fetch(pageConfig.url);
      const html = await response.text();
      mainContent.innerHTML = html;

      // 운영부
      //1. 운영팀
      if (pageId === 'operationTeam') {
        try {
          window.dashboardInitialized = false;

          // CSS — 항상 fresh 보장
          document.querySelectorAll('link[href^="/css/operation.css"]').forEach(l => l.remove());
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/operation.css?t=' + Date.now();
          document.head.appendChild(cssLink);

          // HTML 주입 (이미 위에서 mainContent.innerHTML = html 됐지만 보장 차원)
          // — 위 공통 흐름에서 fetch + innerHTML 이 이미 일어남.

          // 기존 dashboard.js 모두 제거 (버전 query 포함)
          document.querySelectorAll('script[src^="/js/office/dashboard.js"]').forEach(s => s.remove());

          // dashboard.js — fresh fetch
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/js/office/dashboard.js?t=' + Date.now();
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });

          // IIFE 가 자동 부팅하지만 안전 차원 명시 호출
          if (typeof window.bootDashboard === 'function') {
            window.bootDashboard();
          } else if (window.Dashboard) {
            await window.Dashboard.initialize();
          }
          window.dashboardInitialized = true;
        } catch (error) {
          console.error('Error loading operation team page:', error);
          const mainContent = document.getElementById('main-content');
          mainContent.innerHTML = `
            <div class="error-message">
              <h3>페이지 로드 중 오류가 발생했습니다</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
        return;
      }
  
      //2. 대외협력팀
      

      if (pageId === 'cooperationTeam') {
        try {
          // CSS — 항상 fresh 보장
          document.querySelectorAll('link[href^="/css/office_cooperation.css"]').forEach(l => l.remove());
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/office_cooperation.css?t=' + Date.now();
          document.head.appendChild(cssLink);

          // 기존 cooperation.js 모두 제거 (버전 query 포함)
          document.querySelectorAll('script[src^="/js/office/cooperation.js"]').forEach(s => s.remove());

          // cooperation.js — fresh fetch
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/js/office/cooperation.js?t=' + Date.now();
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });

          // Naver Map API Key 동적 조회 및 SDK 로드
          console.log('[MapDebug] Fetching Naver Map key from server...');
          const naverResponse = await fetch('/events/naver-key');
          const naverData = await naverResponse.json();
          const naverKey = naverData.naverKey;

          console.log('[MapDebug] Retrieved Naver Key:', { hasNaverKey: !!naverKey });

          if (naverKey) {
            // 기존 스크립트 제거
            document.querySelectorAll('script[src*="openapi.map.naver.com"]').forEach(s => s.remove());
            document.querySelectorAll('script[src*="oapi.map.naver.com"]').forEach(s => s.remove());

            // Naver SDK 로드
            const naverScript = document.createElement('script');
            naverScript.type = 'text/javascript';
            naverScript.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverKey}`;

            naverScript.onload = () => {
              console.log('[MapDebug] naverScript loaded successfully');
              if (typeof naver !== 'undefined' && naver.maps) {
                if (window.CooperationMap) {
                  window.CooperationMap.initialize();
                } else {
                  console.error('[MapDebug] window.CooperationMap is undefined!');
                }
              } else {
                console.error('[MapDebug] naver.maps object is missing after load.');
              }
            };
            
            naverScript.onerror = (e) => {
              console.error('[MapDebug] naverScript load failed:', e);
            };

            document.head.appendChild(naverScript);
          } else {
            console.error('Naver Map API key not found on server.', { naverKey });
            alert('지도 인증 키가 서버 설정에 누락되었습니다. (.env 파일에 NAVER_MAPS_CLIENT_ID 설정 필요)');
          }
        } catch (error) {
          console.error('Error loading cooperation page:', error);
          const mainContent = document.getElementById('main-content');
          mainContent.innerHTML = `
            <div class="error-message">
              <h3>페이지 로드 중 오류가 발생했습니다</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
        return;
      }

      // 스크립트 로드 헬퍼 함수 (sidebar.js 최상단에 추가)
      function loadScript(src) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      //3. 인사팀
      if (pageId === 'HumanResourceTeam') {
        // CSS도 함께 보장
        if (!document.querySelector('link[href^="/css/hr.css"]')) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/hr.css?v=' + Date.now();
          document.head.appendChild(cssLink);
        }

        // 기존 hr.js 스크립트 제거 (버전 query 포함된 것도 포함)
        document.querySelectorAll('script[src^="/js/office/hr.js"]').forEach(s => s.remove());

        // hr.js 새로 로드 — 항상 fresh
        await new Promise((resolve, reject) => {
          const hrScript = document.createElement('script');
          hrScript.src = '/js/office/hr.js?t=' + Date.now();
          hrScript.onload = resolve;
          hrScript.onerror = reject;
          document.body.appendChild(hrScript);
        });

        // hr.js는 IIFE로 자동 부팅하지만,
        // 안전을 위해 노출된 bootHR도 한 번 더 호출 (idempotent하게 동작하도록 DOM 체크 포함됨)
        if (typeof window.bootHR === 'function') {
          window.bootHR();
        } else if (typeof window.loadUsers === 'function') {
          window.loadUsers();
        }
      }

      //4. 재무팀
      if (pageId === 'financeTeam') {
        try {
          // 기존 스크립트 제거 및 새로 로드
          const existingScript = document.querySelector('script[src="/js/office/finance.js"]');
          if (existingScript) {
            existingScript.remove();
          }
      
          // 새 스크립트 로드
          await new Promise((resolve, reject) => {
            const financeScript = document.createElement('script');
            financeScript.src = '/js/office/finance.js';
            financeScript.onload = resolve;
            financeScript.onerror = reject;
            document.body.appendChild(financeScript);
          });
      
          // CSS 파일 확인 및 추가
          if (!document.querySelector('link[href="/css/finance.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/css/finance.css';
            document.head.appendChild(cssLink);
          }
      
          // HTML 컨텐츠 로드
          const mainContent = document.getElementById('main-content');
          const response = await fetch('/office_finance.html');
          const html = await response.text();
          mainContent.innerHTML = html;
      
          // TransactionTable 및 FeeVerification 초기화
          setTimeout(() => {
            if (typeof TransactionTable === 'function') {
              new TransactionTable();
            }
            if (typeof FeeVerification === 'function') {
              new FeeVerification();
            }
          }, 100); // DOM 업데이트 후 초기화
        } catch (error) {
          console.error('Error loading finance page:', error);
          alert('재무팀 페이지 로드 중 문제가 발생했습니다.');
        }
      }
      
      
      

       // 홍보부
      //5. 마케팅팀
      if (pageId === 'marketingTeam') {
        try {
          // CSS — 항상 fresh
          document.querySelectorAll('link[href^="/css/office/marketing.css"]').forEach(l => l.remove());
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/office/marketing.css?t=' + Date.now();
          document.head.appendChild(cssLink);

          // HTML 주입 (fetch + innerHTML)
          const mainContent = document.getElementById('main-content');
          const r = await fetch('/office_marketing.html');
          mainContent.innerHTML = await r.text();

          // 기존 marketing.js 모두 제거 (버전 query 포함)
          document.querySelectorAll('script[src^="/js/office/marketing.js"]').forEach(s => s.remove());
          delete window.MarketingDashboard;

          // marketing.js — fresh fetch
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/js/office/marketing.js?t=' + Date.now();
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });

          // 초기화
          if (window.MarketingDashboard && typeof window.MarketingDashboard.initialize === 'function') {
            await window.MarketingDashboard.initialize();
          }
        } catch (error) {
          console.error('Error loading marketing team page:', error);
          const mainContent = document.getElementById('main-content');
          mainContent.innerHTML = `
            <div class="error-message">
              <h3>페이지 로드 중 오류가 발생했습니다</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
        return;
      }

      //6. 디자인팀

      //7. 영상제작팀

      //기획부
      //8. 기획팀
      //10.스태프팀
      if (pageId === 'planningTeam') {
        try {
          // CSS — 항상 fresh
          document.querySelectorAll('link[href^="/css/office/planning.css"]').forEach(l => l.remove());
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/office/planning.css?t=' + Date.now();
          document.head.appendChild(cssLink);

          // Chart.js
          if (!window.Chart) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
          }

          // HTML 주입 (위에서 mainContent.innerHTML=html 됐어도 명시)
          const mainContent = document.getElementById('main-content');
          const r = await fetch('/office_planning.html');
          mainContent.innerHTML = await r.text();

          // 기존 planning.js 모두 제거 (버전 query 포함)
          document.querySelectorAll('script[src^="/js/office/planning.js"]').forEach(s => s.remove());

          // planning.js — fresh fetch
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/js/office/planning.js?t=' + Date.now();
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });

          // IIFE 자동 부팅 백업으로 명시 호출
          if (typeof window.bootPlanning === 'function') {
            window.bootPlanning();
          }
        } catch (error) {
          console.error('Error loading planning team page:', error);
          const mainContent = document.getElementById('main-content');
          mainContent.innerHTML = `
            <div class="error-message">
              <h3>기획팀 페이지 로드 중 오류가 발생했습니다</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
        return;
      }

      //9. 정기모임팀
      if (pageId === 'regularTeam') {
        // regular.js 스크립트가 이미 있다면 제거
        const existingHRScript = document.querySelector('script[src="/js/office/regular.js"]');
        if (existingHRScript) {
          existingHRScript.remove();
        }
        const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = './css/regular.css';
          document.head.appendChild(link);
        // regular.js 새로 로드
        await new Promise((resolve, reject) => {
          const hrScript = document.createElement('script');
          hrScript.src = '/js/office/regular.js';
          hrScript.onload = resolve;
          hrScript.onerror = reject;
          document.body.appendChild(hrScript);
        });

        // 사용자 데이터 로드 함수 호출
        if (typeof loadUsers === 'function') {
          loadUsers();
        }
      }
      
      

      // 10. 스태프팀 (기획 가이드 & 스타터-스태프 관리)
      if (pageId === 'staffTeam') {
        try {
          // CSS — 항상 fresh
          document.querySelectorAll('link[href^="/css/office/staff.css"]').forEach(l => l.remove());
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = '/css/office/staff.css?t=' + Date.now();
          document.head.appendChild(cssLink);

          // HTML 주입
          const mainContent = document.getElementById('main-content');
          const r = await fetch('/office_staff.html');
          mainContent.innerHTML = await r.text();

          // 기존 staff.js 모두 제거
          document.querySelectorAll('script[src^="/js/office/staff.js"]').forEach(s => s.remove());
          delete window.StaffDashboard;

          // staff.js — fresh fetch
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/js/office/staff.js?t=' + Date.now();
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });

          // 초기화
          if (window.StaffDashboard && typeof window.StaffDashboard.initialize === 'function') {
            await window.StaffDashboard.initialize();
          }
        } catch (error) {
          console.error('Error loading staff team page:', error);
          const mainContent = document.getElementById('main-content');
          mainContent.innerHTML = `
            <div class="error-message">
              <h3>스태프팀 페이지 로드 중 오류가 발생했습니다</h3>
              <p>${error.message}</p>
            </div>
          `;
        }
        return;
      }

      // 11. 정기모임팀 (캘린더)
      if (pageId === 'regularTeam') {
        window.calendarInitialized = false;

        // TOAST UI Calendar CSS 로드
        if (!document.querySelector('link[href*="toastui-calendar.min.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://uicdn.toast.com/calendar/latest/toastui-calendar.min.css';
          document.head.appendChild(link);
        }

        // TOAST UI Calendar JS 로드
        if (!window.tui?.Calendar) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://uicdn.toast.com/calendar/latest/toastui-calendar.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        // 기존 calendar.js 스크립트 제거
        const existingScript = document.querySelector('script[src="/js/calendar.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        //calendar.js 새로 로드
        await new Promise((resolve, reject) => {
          const calendarScript = document.createElement('script');
          calendarScript.src = '/js/calendar.js';
          calendarScript.onload = resolve;
          calendarScript.onerror = reject;
          document.body.appendChild(calendarScript);
        });
      }

    } catch (error) {
      console.error('Error loading page:', error);
      alert(`페이지 로드 중 오류가 발생했습니다 : ${error.message}`);
    }
  }

  function init(container) {
    container.innerHTML = template;

    const sidebar = container.querySelector('.org-sidebar');
    const header = container.querySelector('.org-header h1');

    // 모바일 메뉴 토글 버튼 추가
    const toggleButton = document.createElement('button');
    toggleButton.className = 'mobile-toggle-btn';
    toggleButton.innerHTML = '☰';
    toggleButton.style.cssText = `
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 1001;
      padding: 0.5rem;
      font-size: 1.5rem;
      background: white;
      border: none;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: none;
    `;

    container.appendChild(toggleButton);

    // 모바일 환경 체크 및 이벤트 리스너 추가
    function checkMobile() {
      if (window.innerWidth <= 768) {
        toggleButton.style.display = 'block';
        sidebar.classList.remove('show');
      } else {
        toggleButton.style.display = 'none';
        sidebar.classList.remove('show');
      }
    }

    // 토글 버튼 클릭 이벤트
    toggleButton.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });

    // 사이드바 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && 
          !sidebar.contains(e.target) && 
          e.target !== toggleButton) {
        sidebar.classList.remove('show');
      }
    });

    // 리사이즈 이벤트
    window.addEventListener('resize', checkMobile);
    checkMobile(); // 초기 실행

    // 기존의 팀 메뉴 클릭 이벤트에 모바일 사이드바 닫기 및 활성화 표시 추가
    container.addEventListener('click', async (e) => {
      const teamLink = e.target.closest('[data-team]');
      if (teamLink) {
        e.preventDefault();
        const teamId = teamLink.dataset.team;
        
        // active 클래스 갱신
        container.querySelectorAll('[data-team]').forEach(link => {
          link.classList.remove('active');
        });
        teamLink.classList.add('active');

        if (window.innerWidth <= 768) {
          sidebar.classList.remove('show');
        }
        await loadPage(teamId);
      }
    });
  }

  return {
    init: init
  };
})();

if (typeof window !== 'undefined') {
  window.Sidebar = Sidebar;
}
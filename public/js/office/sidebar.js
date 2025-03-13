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
          <a href="#" class="org-menu-item" data-team="PlanningTeam">
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
          <a href="#" class="org-menu-item" data-team="starterTeam">
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>스타터팀</strong></div>
              <div class="org-menu-item-description">신입부원 맞충형 관리</div>
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
    PlanningTeam: { url: '/office_planning.html' },
    regularTeam: { url: '/office_regular.html' },
    staffTeam: { url: '/calendar.html' },
    starterTeam : {url: '/office_starter.html'},
    announcement: { url: '/office_announcement.html' }  // Add this line
  };

  const departmentTeams = {
    operation: ['operationTeam', 'cooperationTeam', 'HumanResourceTeam', 'financeTeam'],
    promotion: ['marketingTeam', 'designTeam', 'videoTeam'],
    planning: ['PlanningTeam', 'regularTeam', 'staffTeam','starterTeam']
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
          // 기존 대시보드 초기화 상태 리셋
          window.dashboardInitialized = false;
          
          // 1. CSS 파일이 이미 로드되어 있는지 확인
          if (!document.querySelector('link[href="/css/operation.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/css/operation.css';
            document.head.appendChild(cssLink);
          }

          // 2. Chart.js가 로드되어 있는지 확인
          if (!window.Chart) {
            await new Promise((resolve, reject) => {
              const chartScript = document.createElement('script');
              chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
              chartScript.onload = resolve;
              chartScript.onerror = reject;
              document.head.appendChild(chartScript);
            });
          }

          // 3. HTML 컨텐츠 로드
          const mainContent = document.getElementById('main-content');
          const response = await fetch('/office_operation.html');
          const html = await response.text();
          mainContent.innerHTML = html;

          // 4. dashboard.js 로드 또는 재로드
          const existingDashboard = document.querySelector('script[src="/js/office/dashboard.js"]');
          if (existingDashboard) {
            existingDashboard.remove();
          }

          await new Promise((resolve, reject) => {
            const dashboardScript = document.createElement('script');
            dashboardScript.src = '/js/office/dashboard.js';
            dashboardScript.onload = resolve;
            dashboardScript.onerror = reject;
            document.body.appendChild(dashboardScript);
          });

          // 5. Dashboard 초기화
          if (window.Dashboard) {
            await window.Dashboard.initialize();
            window.dashboardInitialized = true;
          }

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
          // 1. HTML 컨텐츠 로드
          const mainContent = document.getElementById('main-content');
          const response = await fetch('/office_cooperation.html');
          const html = await response.text();
          mainContent.innerHTML = html;

          // 2. CSS 로드
          if (!document.querySelector('link[href="/css/cooperation.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/css/cooperation.css';
            document.head.appendChild(cssLink);
          }

          // 3. 카카오맵 API 로드
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=a20d5436081d8f992f48fb3b6205f2b9&libraries=services,drawing&autoload=false';
            script.onload = () => {
              kakao.maps.load(() => {
                console.log('Kakao maps loaded successfully');
                resolve();
              });
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // 4. cooperation.js 스크립트 로드 및 초기화
          if (!document.querySelector('script[src="/js/office/cooperation.js"]')) {
            await new Promise((resolve, reject) => {
              const cooperationScript = document.createElement('script');
              cooperationScript.src = '/js/office/cooperation.js';
              cooperationScript.onload = resolve;
              cooperationScript.onerror = reject;
              document.body.appendChild(cooperationScript);
            });
          }

          // 5. 실제 지도 초기화 함수
          const initializeMap = () => {
            const container = document.getElementById('map');
            const routeContainer = document.getElementById('route-map');
            
            if (!container || !routeContainer) {
              throw new Error('Map containers not found');
            }

            const options = {
              center: new kakao.maps.LatLng(37.566826, 126.978656),
              level: 3
            };

            const map = new kakao.maps.Map(container, options);
            const routeMap = new kakao.maps.Map(routeContainer, options);

            // 줌 컨트롤 추가
            const zoomControl = new kakao.maps.ZoomControl();
            map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
            routeMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

            // 로딩 표시 제거
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) {
              loadingElement.style.display = 'none';
            }

            return { map, routeMap };
          };

          // 6. 지도 초기화 실행
          console.log('Initializing maps...');
          const maps = initializeMap();
          console.log('Maps initialized:', maps);

          // 이벤트 리스너 설정
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
              const tabId = tab.dataset.tab;
              // 탭 전환
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
              tab.classList.add('active');
              document.getElementById(`${tabId}-section`).classList.add('active');
              // 지도 리사이즈
              if (tabId === 'search') {
                maps.map.relayout();
              } else if (tabId === 'route') {
                maps.routeMap.relayout();
              }
            });
          });

          // cooperation.js 초기화 함수 호출
          if (window.CooperationMap && typeof window.CooperationMap.initialize === 'function') {
            window.CooperationMap.initialize();
          }

        } catch (error) {
          console.error('Error loading cooperation team page:', error);
          const loadingElement = document.getElementById('map-loading');
          if (loadingElement) {
            loadingElement.style.display = 'none';
          }
          alert('대외협력팀 페이지 로드 중 오류가 발생했습니다.');
        }
      }

      //3. 인사팀
      if (pageId === 'HumanResourceTeam') {
        // hr.js 스크립트가 이미 있다면 제거
        const existingHRScript = document.querySelector('script[src="/js/office/hr.js"]');
        if (existingHRScript) {
          existingHRScript.remove();
        }

        // hr.js 새로 로드
        await new Promise((resolve, reject) => {
          const hrScript = document.createElement('script');
          hrScript.src = '/js/office/hr.js';
          hrScript.onload = resolve;
          hrScript.onerror = reject;
          document.body.appendChild(hrScript);
        });

        // 사용자 데이터 로드 함수 호출
        if (typeof loadUsers === 'function') {
          loadUsers();
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

      //6. 디자인팀

      //7. 영상제작팀

      //기획부
      //8. 기획팀

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
      //10.스태프팀
      if (pageId === 'staffTeam') {
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

    // 팀 메뉴 클릭 이벤트 위임
    container.addEventListener('click', async (e) => {
      const teamLink = e.target.closest('[data-team]');
      if (teamLink) {
        e.preventDefault();
        const teamId = teamLink.dataset.team;
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
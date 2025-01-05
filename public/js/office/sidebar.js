const Sidebar = (function() {
  const template = `
    <div class="org-sidebar" id="org-sidebar">
      <div class="org-header">
        <a href="index.html"> <h1>Contenido</h1> </a>
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
        </div>

        <button class="org-toggle-btn">접기</button>
      </div>
    </div>
  `;

  
    // 팀별 페이지 설정
    const pageConfigs = {
      staffTeam: {
        url: '/calendar.html'
      },
      operationTeam: {
        url: '/office_operation.html'
      },
      marketingTeam: {
        url: '/office_marketing.html'
      },
      HumanResourceTeam: {
        url: '/office_hr.html'
      },
      cooperationTeam: {
        url: '/office_cooperation.html'
      },
      PlanningTeam: {
        url: '/office_planning.html'
      },
      financeTeam: {
        url: '/office_finance.html'
      },
      designTeam: {
        url: '/office_design.html'
      },
      videoTeam: {
        url: '/office_video.html'
      },
      regularTeam: {
        url: '/office_regular.html'
      }
      // 다른 팀들의 페이지 URL도 여기에 추가
    };
  
    // 페이지 로드 함수
    async function loadPage(pageId) {
      try {
        const pageConfig = pageConfigs[pageId];
        if (!pageConfig) return;
    
        const mainContent = document.getElementById('main-content');
        const response = await fetch(pageConfig.url);
        const html = await response.text();
        mainContent.innerHTML = html;
        // 운영부
        //1. 운영팀

        //2. 대외협력팀

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
        

        // 홍보부
        //5. 마케팅팀

        //6. 디자인팀

        //7. 영상제작팀

        //기획부
        //8. 기획팀
        
        //9. 정기모임팀

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
      }
    }
  
    function init(container) {
      container.innerHTML = template;
  
      const sidebar = container.querySelector('.org-sidebar');
      const toggleBtn = container.querySelector('.org-toggle-btn');
      const header = container.querySelector('.org-header h1');
  
      // 사이드바 토글 기능
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
          header.textContent = 'Con';
          toggleBtn.textContent = '펼치기';
        } else {
          header.textContent = 'Contenido';
          toggleBtn.textContent = '접기';
        }
      });
  
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
// public/js/office/sidebar.js — Office Shell Navigation & Scoped Team Asset Loader
const Sidebar = (function () {
  const ICONS = {
    operation: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    promotion: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    planning: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
    org: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>'
  };

  const template = `
    <div class="org-sidebar" id="org-sidebar">
      <div class="org-header">
        <a href="/office.html" class="org-header-brand">
          <span class="org-header-dot" aria-hidden="true"></span>
          <h1>CONTENIDO</h1>
        </a>
        <span class="org-header-sub">OFFICE WORKSPACE</span>
      </div>

      <div class="org-quick-links">
        <a href="/office.html" class="org-quick-btn">${ICONS.org}<span>조직도</span></a>
        <a href="/index.html" class="org-quick-btn">${ICONS.home}<span>메인 홈</span></a>
      </div>

      <div class="org-menu">
        <!-- 운영부 -->
        <div class="org-menu-item org-dept-heading">
          <i>${ICONS.operation}</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">운영부</div>
            <div class="org-menu-item-description">조직 운영 및 관리</div>
          </div>
        </div>

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
        </div>

        <!-- 홍보부 -->
        <div class="org-menu-item org-dept-heading">
          <i>${ICONS.promotion}</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">홍보부</div>
            <div class="org-menu-item-description">대외 홍보 및 동아리 모집</div>
          </div>
        </div>

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
        <div class="org-menu-item org-dept-heading">
          <i>${ICONS.planning}</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">기획부</div>
            <div class="org-menu-item-description">이벤트 및 정기모임 기획</div>
          </div>
        </div>

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

  const pageConfigs = {
    operationTeam: { url: '/office_operation.html' },
    cooperationTeam: { url: '/office_cooperation.html' },
    HumanResourceTeam: { url: '/office_hr.html' },
    marketingTeam: { url: '/office_marketing.html' },
    designTeam: { url: '/office_design.html' },
    videoTeam: { url: '/office_video.html' },
    planningTeam: { url: '/office_planning.html' },
    regularTeam: { url: '/office_regular.html' },
    staffTeam: { url: '/office_staff.html' },
    announcement: { url: '/office_announcement.html' }
  };

  const departmentTeams = {
    operation: ['operationTeam', 'cooperationTeam', 'HumanResourceTeam'],
    promotion: ['marketingTeam', 'designTeam', 'videoTeam'],
    planning: ['planningTeam', 'regularTeam', 'staffTeam']
  };

  /**
   * 이전 팀 페이지의 CSS를 모두 제거해 팀 간 스타일/스크롤 오염(leak)을 원천 차단
   */
  function clearPreviousTeamStyles() {
    document.querySelectorAll('link[data-office-team-css]').forEach((l) => l.remove());
  }

  function loadTeamCss(href, teamId) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = href + (href.includes('?') ? '&' : '?') + 't=' + Date.now();
    cssLink.dataset.officeTeamCss = teamId;
    document.head.appendChild(cssLink);
    return cssLink;
  }

  function loadFreshScript(src, matchPrefix) {
    if (matchPrefix) {
      document.querySelectorAll(`script[src^="${matchPrefix}"]`).forEach((s) => s.remove());
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

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

  function hasAccessToPage(userRole, teamId) {
    if (!userRole) return false;
    if (userRole.role === 'admin') return true;
    if (userRole.role !== 'officer') return false;

    const normalizedTarget = (teamId || '').toLowerCase();
    const normalizedUserTeam = (userRole.team || '').toLowerCase();

    if (userRole.isDepartmentHead) {
      let userDept = (userRole.department || '').toLowerCase();
      if (userDept.includes('기획') || userDept === 'planning') userDept = 'planning';
      else if (userDept.includes('운영') || userDept === 'operation') userDept = 'operation';
      else if (userDept.includes('홍보') || userDept === 'promotion') userDept = 'promotion';

      const allowedTeams = (departmentTeams[userDept] || []).map((t) => t.toLowerCase());
      if (allowedTeams.includes(normalizedTarget)) return true;
    }

    if (normalizedUserTeam && normalizedUserTeam === normalizedTarget) {
      return true;
    }

    return false;
  }

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

      // 이전 팀 CSS를 완전히 해제하여 전역 스타일 누수 방지
      clearPreviousTeamStyles();

      const mainContent = document.getElementById('main-content');
      const response = await fetch(pageConfig.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      mainContent.innerHTML = html;
      window.scrollTo({ top: 0, behavior: 'instant' });

      // 1. 운영팀
      if (pageId === 'operationTeam') {
        try {
          window.dashboardInitialized = false;
          loadTeamCss('/css/operation.css', pageId);
          await loadFreshScript('/js/office/dashboard.js', '/js/office/dashboard.js');

          if (typeof window.bootDashboard === 'function') {
            window.bootDashboard();
          } else if (window.Dashboard) {
            await window.Dashboard.initialize();
          }
          window.dashboardInitialized = true;
        } catch (error) {
          console.error('Error loading operation team page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }

      // 2. 대외협력팀
      if (pageId === 'cooperationTeam') {
        try {
          loadTeamCss('/css/office_cooperation.css', pageId);
          await loadFreshScript('/js/office/cooperation.js', '/js/office/cooperation.js');

          const naverResponse = await fetch('/events/naver-key');
          const naverData = await naverResponse.json();
          const naverKey = naverData.naverKey;

          if (naverKey) {
            document.querySelectorAll('script[src*="openapi.map.naver.com"], script[src*="oapi.map.naver.com"]').forEach((s) => s.remove());
            const naverScript = document.createElement('script');
            naverScript.type = 'text/javascript';
            naverScript.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverKey}`;
            naverScript.onload = () => {
              if (typeof naver !== 'undefined' && naver.maps && window.CooperationMap) {
                window.CooperationMap.initialize();
              }
            };
            document.head.appendChild(naverScript);
          } else {
            alert('지도 인증 키가 서버 설정에 누락되었습니다. (.env 파일에 NAVER_MAPS_CLIENT_ID 설정 필요)');
          }
        } catch (error) {
          console.error('Error loading cooperation page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }

      // 3. 인사팀
      if (pageId === 'HumanResourceTeam') {
        try {
          loadTeamCss('/css/hr.css', pageId);
          await loadFreshScript('/js/office/hr.js', '/js/office/hr.js');

          if (typeof window.bootHR === 'function') {
            window.bootHR();
          } else if (typeof window.loadUsers === 'function') {
            window.loadUsers();
          }
        } catch (error) {
          console.error('Error loading Human Resource page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>인사팀 페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }

      // 4. 홍보팀 (마케팅팀)
      if (pageId === 'marketingTeam') {
        try {
          loadTeamCss('/css/office/marketing.css', pageId);
          delete window.MarketingDashboard;
          await loadFreshScript('/js/office/marketing.js', '/js/office/marketing.js');

          if (window.MarketingDashboard && typeof window.MarketingDashboard.initialize === 'function') {
            await window.MarketingDashboard.initialize();
          }
        } catch (error) {
          console.error('Error loading marketing team page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }

      // 5. 기획팀
      if (pageId === 'planningTeam') {
        try {
          loadTeamCss('/css/office/planning.css', pageId);

          if (!window.Chart) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
          }

          await loadFreshScript('/js/office/planning.js', '/js/office/planning.js');

          if (typeof window.bootPlanning === 'function') {
            window.bootPlanning();
          }
        } catch (error) {
          console.error('Error loading planning team page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>기획팀 페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }

      // 6. 정기모임팀
      if (pageId === 'regularTeam') {
        try {
          loadTeamCss('/css/office/regular.css', pageId);
          delete window.RegularDashboard;
          await loadFreshScript('/js/office/regular.js', '/js/office/regular.js');
        } catch (err) {
          console.error('[Sidebar] Error loading regularTeam:', err);
          mainContent.innerHTML = `<div class="error-message"><h3>정기모임팀 페이지 로드 중 오류가 발생했습니다</h3><p>${err.message}</p></div>`;
        }
        return;
      }

      // 7. 스태프팀
      if (pageId === 'staffTeam') {
        try {
          loadTeamCss('/css/office/staff.css', pageId);
          delete window.StaffDashboard;
          await loadFreshScript('/js/office/staff.js', '/js/office/staff.js');

          if (window.StaffDashboard && typeof window.StaffDashboard.initialize === 'function') {
            await window.StaffDashboard.initialize();
          }
        } catch (error) {
          console.error('Error loading staff team page:', error);
          mainContent.innerHTML = `<div class="error-message"><h3>스태프팀 페이지 로드 중 오류가 발생했습니다</h3><p>${error.message}</p></div>`;
        }
        return;
      }
    } catch (error) {
      console.error('Error loading page:', error);
      alert(`페이지 로드 중 오류가 발생했습니다 : ${error.message}`);
    }
  }

  function init(container) {
    container.innerHTML = template;

    const sidebar = container.querySelector('.org-sidebar');

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'mobile-toggle-btn';
    toggleButton.setAttribute('aria-label', '운영진 메뉴 열기');
    toggleButton.innerHTML = ICONS.menu;
    container.appendChild(toggleButton);

    function checkMobile() {
      if (window.innerWidth <= 768) {
        toggleButton.style.display = 'inline-flex';
        sidebar.classList.remove('show');
      } else {
        toggleButton.style.display = 'none';
        sidebar.classList.remove('show');
      }
    }

    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !toggleButton.contains(e.target)) {
        sidebar.classList.remove('show');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
      }
    });

    window.addEventListener('resize', checkMobile);
    checkMobile();

    container.addEventListener('click', async (e) => {
      const teamLink = e.target.closest('[data-team]');
      if (teamLink) {
        e.preventDefault();
        const teamId = teamLink.dataset.team;

        container.querySelectorAll('[data-team]').forEach((link) => {
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

  return { init };
})();

if (typeof window !== 'undefined') {
  window.Sidebar = Sidebar;
}

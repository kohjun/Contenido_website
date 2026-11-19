// public/js/utils/nav-injector.js
// 인증 모듈 — 실인증 (AUTH_MODE=real 일 때 백엔드와 연동, dummy 모드에서도 /user/info가 더미를 반환하므로 호환)
const AuthModule = {
  /** 토큰/세션 유효성 검사 (/user/info 200 여부) */
  verifyToken: async function () {
    try {
      const res = await fetch('/user/info', { credentials: 'include' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /** 로그인 페이지(/login.html)로 이동 — ID/PW + 카카오 둘 다 제공 */
  redirectToLogin: function (showAlert = true) {
    if (showAlert) {
      try { alert('로그인이 필요합니다.'); } catch (e) {}
    }
    window.location.href = '/login.html';
  },

  /** 로그인 페이지로 이동 (nav 로그인 버튼용) */
  goToLogin: function () {
    window.location.href = '/login.html';
  },

  /** 인증 확인 — 미인증이면 로그인 페이지로 리다이렉트 */
  checkAuthentication: async function () {
    const ok = await this.verifyToken();
    if (!ok) {
      this.redirectToLogin(false);
      return false;
    }
    return true;
  },

  /** 현재 로그인 사용자 정보 (/user/info) */
  loadUserInfo: async function () {
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
  logout: async function (redirect = true) {
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
  loginWithKakao: function () {
    const ret = encodeURIComponent(window.location.origin + '/events.html');
    window.location.href = '/auth/kakao?state=' + ret;
  }
};

window.AuthModule = AuthModule;

/* ── Ensure global Design System & Speculation Rules (modern-web-guidance) ── */
(function bootstrapModernPlatform() {
  if (!document.querySelector('link[href*="design-system.css"]')) {
    const ds = document.createElement('link');
    ds.rel = 'stylesheet';
    ds.href = '/css/design-system.css?v=20261119';
    document.head.prepend(ds);
  }

  if (
    typeof HTMLScriptElement !== 'undefined' &&
    HTMLScriptElement.supports &&
    HTMLScriptElement.supports('speculationrules') &&
    !document.querySelector('script[type="speculationrules"]')
  ) {
    const spec = document.createElement('script');
    spec.type = 'speculationrules';
    spec.textContent = JSON.stringify({
      prefetch: [
        {
          where: {
            and: [
              { href_matches: '/*' },
              { not: { href_matches: '/auth/*' } },
              { not: { href_matches: '/office*' } },
              { not: { href_matches: '/logout*' } },
              { not: { selector_matches: '[data-no-prefetch]' } }
            ]
          },
          eagerness: 'moderate'
        }
      ]
    });
    document.head.appendChild(spec);
  }
})();

const NAV_ICONS = {
  bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1V9.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  office: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  events: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.4 4.86L20 7.7l-4 3.9.94 5.5L12 14.5l-4.94 2.6.94-5.5-4-3.9 5.6-.84L12 2z"/></svg>',
  ended: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2.5"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  ranking: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>',
  manage: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  community: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  rules: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  partner: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
};

const navStyles = `
/* Zero-specificity fallback for pages without custom .container styling */
:where(.container) {
  position: relative;
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
  padding: calc(var(--nav-top-h, 64px) + 16px) 20px calc(var(--nav-bottom-h, 66px) + 28px);
  background: var(--c-surface, #FFFFFF);
  border-radius: 0;
  min-height: 100dvh;
  box-sizing: border-box;
}

/* ── Top Navigation Bar ── */
.custom-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-top-h, 64px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--c-surface-glass, rgba(255, 255, 255, 0.88));
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border-bottom: 1px solid var(--c-border, #DCE7F5);
  box-shadow: 0 1px 10px rgba(12, 30, 56, 0.04);
  z-index: 1000;
  view-transition-name: contenido-top-nav;
}

.nav-title {
  font-family: var(--ff-base, 'GmarketSansMedium', sans-serif);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--c-brand, #0A84FE);
  cursor: pointer;
  margin: 0;
  padding: 6px 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
  user-select: none;
  transition: opacity var(--t-fast, 150ms) var(--ease, ease), translate var(--t-fast, 150ms) var(--ease, ease);
}

.nav-title::before {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--brand-400, #4AA4FE), var(--brand-600, #056DE0));
  box-shadow: 0 2px 6px rgba(10, 132, 254, 0.35);
  flex-shrink: 0;
}

.nav-title:hover {
  opacity: 0.84;
}

.nav-title:active {
  scale: 0.98;
}

.top-right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-icon-btn {
  background: var(--brand-50, #F0F7FF);
  color: var(--c-brand, #0A84FE);
  border: 1px solid var(--brand-100, #DEEEFF);
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  transition: background-color var(--t-fast, 150ms) var(--ease, ease),
              border-color var(--t-fast, 150ms) var(--ease, ease),
              scale var(--t-fast, 150ms) var(--ease-spring, ease);
}

.top-icon-btn:hover {
  background: var(--brand-100, #DEEEFF);
  border-color: var(--brand-200, #BBDDFD);
  scale: 1.04;
}

.top-icon-btn:active {
  scale: 0.95;
}

.top-icon-btn .custom-nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  line-height: 1;
}

/* ── Notifications Popover ── */
.notif-wrap {
  position: relative;
  display: inline-flex;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  box-sizing: border-box;
  background: var(--c-danger, #E11D48);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  box-shadow: 0 0 0 2px #FFFFFF;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 332px;
  max-height: 440px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #DCE7F5);
  border-radius: var(--r-lg, 18px);
  box-shadow: var(--sh-lg, 0 20px 44px rgba(12, 30, 56, 0.16));
  z-index: 2000;
  display: none;
  opacity: 0;
  translate: 0 -6px;
  scale: 0.98;
  transition: opacity 180ms var(--ease, ease),
              translate 180ms var(--ease, ease),
              scale 180ms var(--ease, ease),
              display 180ms allow-discrete;
}

.notif-panel.show {
  display: block;
  opacity: 1;
  translate: 0 0;
  scale: 1;
}

@starting-style {
  .notif-panel.show {
    opacity: 0;
    translate: 0 -8px;
    scale: 0.97;
  }
}

.notif-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--c-text, #0C1E38);
  position: sticky;
  top: 0;
  background: var(--c-surface, #FFFFFF);
  z-index: 2;
}

.notif-readall {
  background: var(--brand-50, #F0F7FF);
  border: 1px solid var(--brand-100, #DEEEFF);
  color: var(--c-brand, #0A84FE);
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--r-pill, 999px);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.notif-readall:hover {
  background: var(--c-brand, #0A84FE);
  color: #FFFFFF;
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif-item {
  padding: 13px 16px;
  border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
  cursor: pointer;
  transition: background-color 150ms ease;
  position: relative;
}

.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--c-surface-2, #F2F6FC); }

.notif-item.unread {
  background: var(--brand-50, #F0F7FF);
  padding-left: 24px;
}

.notif-item.unread::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 19px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-brand, #0A84FE);
}

.notif-item.unread .notif-title { font-weight: 700; }

.notif-title {
  font-size: 0.86rem;
  color: var(--c-text, #0C1E38);
  line-height: 1.45;
}

.notif-time {
  font-size: 11px;
  color: var(--c-text-faint, #8CA1BC);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.notif-empty {
  padding: 36px 16px;
  text-align: center;
  color: var(--c-text-faint, #8CA1BC);
  font-size: 0.85rem;
}

/* ── Auth Area & User Dropdown ── */
.auth-area {
  position: static;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-button {
  height: 38px;
  padding: 0 18px;
  background: var(--c-brand, #0A84FE);
  color: #FFFFFF;
  border: none;
  border-radius: var(--r-pill, 999px);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(10, 132, 254, 0.28);
  transition: background-color 150ms ease, translate 150ms ease, box-shadow 150ms ease;
}

.login-button:hover {
  background: var(--c-brand-strong, #056DE0);
  translate: 0 -1px;
  box-shadow: 0 6px 16px rgba(10, 132, 254, 0.36);
}

.user-dropdown {
  position: relative;
  display: inline-block;
}

.user-dropdown-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 13px 0 14px;
  background: var(--c-surface, #FFFFFF);
  color: var(--c-text, #0C1E38);
  border: 1px solid var(--c-border, #DCE7F5);
  border-radius: var(--r-pill, 999px);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sh-xs, 0 1px 2px rgba(12, 30, 56, 0.04));
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.user-dropdown-button:hover,
.user-dropdown-button.active {
  background: var(--brand-50, #F0F7FF);
  border-color: var(--brand-200, #BBDDFD);
  color: var(--c-brand-deep, #0755B3);
}

.user-dropdown-button > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.user-dropdown-button .arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--c-brand, #0A84FE);
  transition: rotate 200ms var(--ease, ease);
}

.user-dropdown-button.active .arrow {
  rotate: 180deg;
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #DCE7F5);
  border-radius: var(--r-lg, 18px);
  box-shadow: var(--sh-lg, 0 20px 44px rgba(12, 30, 56, 0.16));
  min-width: 236px;
  z-index: 1002;
  overflow: hidden;
  display: none;
  opacity: 0;
  translate: 0 -6px;
  scale: 0.98;
  transition: opacity 180ms var(--ease, ease),
              translate 180ms var(--ease, ease),
              scale 180ms var(--ease, ease),
              display 180ms allow-discrete;
}

.user-dropdown-menu.show {
  display: block;
  opacity: 1;
  translate: 0 0;
  scale: 1;
}

@starting-style {
  .user-dropdown-menu.show {
    opacity: 0;
    translate: 0 -8px;
    scale: 0.97;
  }
}

.user-dropdown-header {
  padding: 16px;
  border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
  background: linear-gradient(180deg, var(--brand-50, #F0F7FF) 0%, #FFFFFF 100%);
}

.user-dropdown-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.user-dropdown-name {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--c-text, #0C1E38);
  margin: 0;
}

.user-dropdown-role {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: var(--r-pill, 999px);
  background: var(--brand-100, #DEEEFF);
  color: var(--brand-700, #0755B3);
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.user-dropdown-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: var(--r-sm, 10px);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-subtle, #EAF1FA);
}

.stat-label {
  font-size: 0.72rem;
  color: var(--c-text-muted, #5A708D);
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--c-brand, #0A84FE);
  font-variant-numeric: tabular-nums;
}

.stat-value.warning {
  color: var(--c-danger, #E11D48);
}

.user-dropdown-actions {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-action-button {
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--c-text-soft, #304765);
  cursor: pointer;
  border-radius: var(--r-sm, 10px);
  display: flex;
  align-items: center;
  gap: 9px;
  transition: background-color 150ms ease, color 150ms ease;
}

.dropdown-action-button:hover {
  background: var(--brand-50, #F0F7FF);
  color: var(--c-brand-deep, #0755B3);
}

.dropdown-action-button.logout {
  color: var(--c-danger, #E11D48);
}

.dropdown-action-button.logout:hover {
  background: var(--c-danger-bg, #FFF1F2);
  color: #BE123C;
}

/* ── Slide-in Sidebar Drawer (GPU translate + overscroll containment) ── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: min(82vw, 290px);
  height: 100dvh;
  background: var(--c-surface, #FFFFFF);
  border-right: 1px solid var(--c-border, #DCE7F5);
  box-shadow: 12px 0 36px rgba(8, 28, 59, 0.16);
  translate: -105% 0;
  transition: translate 280ms var(--ease, cubic-bezier(0.22, 1, 0.36, 1));
  z-index: 1010;
  padding: 18px 18px 28px;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sidebar.is-open {
  translate: 0 0;
}

.sidebar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
}

.sidebar-brand {
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--c-brand, #0A84FE);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sidebar-brand::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--c-brand, #0A84FE);
}

.sidebar-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--brand-100, #DEEEFF);
  background: var(--brand-50, #F0F7FF);
  color: var(--c-brand, #0A84FE);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 160ms ease, color 160ms ease, scale 160ms ease;
}

.sidebar-close:hover {
  background: var(--c-brand, #0A84FE);
  color: #FFFFFF;
}

.sidebar-close:active {
  scale: 0.94;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 28, 59, 0.44);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 240ms var(--ease, ease);
  z-index: 1005;
}

.sidebar.is-open ~ .sidebar-backdrop,
body.sidebar-open .sidebar-backdrop {
  opacity: 1;
  pointer-events: auto;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.sidebar-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-text-faint, #8CA1BC);
  padding: 12px 10px 4px;
  margin: 0;
}

.sidebar h3 {
  font-size: 0.92rem;
  margin: 0;
  font-weight: 700;
  color: var(--c-text, #0C1E38);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 2px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sidebar li {
  margin: 0;
  padding: 0;
}

.sidebar a {
  text-decoration: none;
  color: var(--c-text-soft, #304765);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--r-md, 14px);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 160ms ease, color 160ms ease, translate 160ms ease;
}

.sidebar a .c-nav-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-50, #F0F7FF);
  color: var(--c-brand, #0A84FE);
  flex-shrink: 0;
  transition: background-color 160ms ease, color 160ms ease;
}

.sidebar a:hover {
  background: var(--brand-50, #F0F7FF);
  color: var(--c-brand-deep, #0755B3);
  translate: 2px 0;
}

.sidebar a.is-current {
  background: var(--c-brand, #0A84FE);
  color: #FFFFFF;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(10, 132, 254, 0.25);
}

.sidebar a.is-current .c-nav-ico {
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.sidebar a.is-current h3 {
  color: #FFFFFF;
}

.sidebar-staff-card {
  background: linear-gradient(135deg, var(--brand-50, #F0F7FF) 0%, var(--brand-100, #DEEEFF) 100%);
  border: 1px solid var(--brand-200, #BBDDFD);
  margin-bottom: 4px;
}

.sidebar-staff-card h3 {
  color: var(--brand-700, #0755B3);
}

.sidebar-divider {
  height: 1px;
  background: var(--c-border-subtle, #EAF1FA);
  margin: 6px 8px;
}

/* ── Bottom Navigation Bar ── */
.custom-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--nav-bottom-h, 66px) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--c-surface-glass-strong, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid var(--c-border, #DCE7F5);
  box-shadow: 0 -4px 18px rgba(12, 30, 56, 0.05);
  z-index: 1000;
  view-transition-name: contenido-bottom-nav;
}

.custom-nav-button {
  flex: 1;
  max-width: 140px;
  height: 52px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: transparent;
  color: var(--c-text-muted, #5A708D);
  padding: 4px 10px;
  border-radius: var(--r-md, 14px);
  cursor: pointer;
  position: relative;
  transition: color 160ms ease, background-color 160ms ease, scale 140ms var(--ease-spring, ease);
}

.custom-nav-button:hover {
  color: var(--c-brand, #0A84FE);
  background: var(--brand-50, #F0F7FF);
}

.custom-nav-button:active {
  scale: 0.94;
}

.custom-nav-button.active {
  color: var(--c-brand, #0A84FE);
  background: var(--brand-50, #F0F7FF);
}

.custom-nav-button.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  width: 24px;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: var(--c-brand, #0A84FE);
}

.custom-nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  line-height: 1;
}

.custom-nav-label {
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}

/* Legacy helpers kept neutral */
.toggle-btn { display: none; }

@media (max-width: 768px) {
  .custom-top-nav {
    padding: 0 14px;
    height: 60px;
  }
  :root {
    --nav-top-h: 60px;
    --nav-bottom-h: 62px;
  }
  .top-right-actions { gap: 8px; }
  .user-dropdown-button {
    height: 35px;
    padding: 0 11px;
    font-size: 0.8rem;
  }
  .user-dropdown-button > span:first-child { max-width: 112px; }
}

@media (max-width: 480px) {
  .nav-title { font-size: 1.12rem; letter-spacing: 0.03em; }
  .top-icon-btn { width: 36px; height: 36px; border-radius: 10px; }
  .login-button { height: 34px; padding: 0 14px; font-size: 0.8rem; }
  .user-dropdown-button > span:first-child { max-width: 96px; }
  .notif-panel {
    position: fixed;
    top: 66px;
    left: 12px;
    right: 12px;
    width: auto;
    max-width: none;
    max-height: calc(100dvh - 88px);
    border-radius: var(--r-lg, 18px);
  }
  .user-dropdown-menu {
    min-width: 214px;
    max-width: calc(100vw - 24px);
  }
}
`;

// 사이드바 HTML (Root-relative URLs + crisp SVG icons)
const sidebarHTML = `
<aside>
  <div id="sidebar" class="sidebar" inert aria-label="사이트 메뉴">
    <div class="sidebar-top-bar">
      <span class="sidebar-brand">CONTENIDO</span>
      <button type="button" class="sidebar-close" onclick="toggleSidebar()" aria-label="메뉴 닫기">${NAV_ICONS.close}</button>
    </div>
    <div class="sidebar-content">
      <a href="/office.html" id="staffPageLink" class="sidebar-staff-card" style="display: none;">
        <span class="c-nav-ico">${NAV_ICONS.office}</span>
        <h3>운영진 페이지</h3>
      </a>

      <p class="sidebar-section-label">동아리 활동</p>
      <ul>
        <li><a href="/mypage.html"><span class="c-nav-ico">${NAV_ICONS.user}</span><span>마이페이지</span></a></li>
        <li><a href="/events.html"><span class="c-nav-ico">${NAV_ICONS.events}</span><span>진행중인 이벤트</span></a></li>
        <li><a href="/ended-events.html"><span class="c-nav-ico">${NAV_ICONS.ended}</span><span>종료된 이벤트</span></a></li>
        <li><a href="/calendar.html"><span class="c-nav-ico">${NAV_ICONS.calendar}</span><span>이벤트 캘린더</span></a></li>
        <li><a href="/ranking"><span class="c-nav-ico">${NAV_ICONS.ranking}</span><span>활동 랭킹</span></a></li>
        <li><a href="/event-staff.html" id="eventStaffLink" style="display: none;"><span class="c-nav-ico">${NAV_ICONS.manage}</span><span>이벤트 관리</span></a></li>
        <li><a href="/community.html"><span class="c-nav-ico">${NAV_ICONS.community}</span><span>커뮤니티</span></a></li>
      </ul>

      <div class="sidebar-divider"></div>
      <p class="sidebar-section-label">안내 및 혜택</p>
      <ul>
        <li><a href="/rules.html"><span class="c-nav-ico">${NAV_ICONS.rules}</span><span>동아리 회칙 및 매뉴얼</span></a></li>
        <li><a href="/partnerships"><span class="c-nav-ico">${NAV_ICONS.partner}</span><span>협찬 및 제휴</span></a></li>
      </ul>
    </div>
  </div>
  <div class="sidebar-backdrop" onclick="toggleSidebar()"></div>
</aside>
`;

// 상단 네비게이션 HTML
const topNavHTML = `
<div class="c-scroll-progress" aria-hidden="true"></div>
<nav class="custom-top-nav" aria-label="상단 내비게이션">
  <span class="nav-title" onclick="goHome()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')goHome()">CONTENIDO</span>
  <div class="top-right-actions">
    <div class="notif-wrap">
      <button type="button" class="top-icon-btn" id="notif-toggle-btn" onclick="handleNotifications(event)" aria-label="알림" aria-expanded="false">
        <i class="custom-nav-icon">${NAV_ICONS.bell}</i>
        <span class="notif-badge" id="notif-badge" hidden>0</span>
      </button>
      <div class="notif-panel" id="notif-panel" role="region" aria-label="알림 목록">
        <div class="notif-panel-header">
          <span>알림</span>
          <button class="notif-readall" type="button" onclick="markAllNotificationsRead()">모두 읽음</button>
        </div>
        <ul class="notif-list" id="notif-list"></ul>
        <div class="notif-empty" id="notif-empty" hidden>새 알림이 없습니다</div>
      </div>
    </div>
    <div class="auth-area" id="auth-area"></div>
  </div>
</nav>
`;

// 하단 네비게이션 HTML — 메뉴 + 홈 + 마이
const bottomNavHTML = `
<nav class="custom-bottom-nav" aria-label="하단 내비게이션">
  <button type="button" class="custom-nav-button" id="nav-btn-menu" onclick="toggleSidebar()" aria-label="메뉴" aria-expanded="false">
    <i class="custom-nav-icon">${NAV_ICONS.menu}</i>
    <span class="custom-nav-label">메뉴</span>
  </button>
  <button type="button" class="custom-nav-button" id="nav-btn-home" onclick="goHome()" aria-label="홈">
    <i class="custom-nav-icon">${NAV_ICONS.home}</i>
    <span class="custom-nav-label">홈</span>
  </button>
  <button type="button" class="custom-nav-button" id="nav-btn-mypage" onclick="handleMyPageClick(event)" aria-label="마이페이지">
    <i class="custom-nav-icon">${NAV_ICONS.user}</i>
    <span class="custom-nav-label">마이</span>
  </button>
</nav>
`;

// 드롭다운 토글 함수
function toggleUserDropdown() {
  const button = document.querySelector('.user-dropdown-button');
  const menu = document.querySelector('.user-dropdown-menu');

  if (button && menu) {
    const isOpening = !menu.classList.contains('show');
    button.classList.toggle('active', isOpening);
    menu.classList.toggle('show', isOpening);
    button.setAttribute('aria-expanded', String(isOpening));
    if (isOpening) {
      const notifPanel = document.getElementById('notif-panel');
      if (notifPanel) notifPanel.classList.remove('show');
    }
  }
}

// 외부 클릭 및 Escape 키로 팝오버/사이드바 닫기
document.addEventListener('click', function (event) {
  const dropdown = document.querySelector('.user-dropdown');
  if (dropdown && !dropdown.contains(event.target)) {
    const button = document.querySelector('.user-dropdown-button');
    const menu = document.querySelector('.user-dropdown-menu');
    if (button && menu) {
      button.classList.remove('active');
      menu.classList.remove('show');
      button.setAttribute('aria-expanded', 'false');
    }
  }

  const notifWrap = document.querySelector('.notif-wrap');
  const notifPanel = document.getElementById('notif-panel');
  const notifBtn = document.getElementById('notif-toggle-btn');
  if (notifWrap && notifPanel && !notifWrap.contains(event.target)) {
    notifPanel.classList.remove('show');
    if (notifBtn) notifBtn.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('is-open')) {
    toggleSidebar(false);
  }
  const notifPanel = document.getElementById('notif-panel');
  if (notifPanel && notifPanel.classList.contains('show')) {
    notifPanel.classList.remove('show');
    const notifBtn = document.getElementById('notif-toggle-btn');
    if (notifBtn) notifBtn.setAttribute('aria-expanded', 'false');
  }
  const menu = document.querySelector('.user-dropdown-menu');
  const button = document.querySelector('.user-dropdown-button');
  if (menu && menu.classList.contains('show')) {
    menu.classList.remove('show');
    if (button) {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    }
  }
});

// 인증 영역 업데이트 함수
async function updateAuthArea() {
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;

  try {
    const response = await fetch('/user/info_database');

    if (response.status === 200) {
      const userData = await response.json();
      const regularAttendance = userData.participationCount?.regularCount || 0;
      const warningCount = userData.warningCount || 0;
      const safeName = notifEscape(userData.name || userData.displayName || '회원');
      const roleLabel =
        userData.role === 'admin' ? '관리자' :
        userData.role === 'starter' ? '스타터' :
        userData.role === 'participant' ? '부원' :
        userData.role === 'officer' ? '운영진' :
        notifEscape(userData.role || '회원');

      authArea.innerHTML = `
        <div class="user-dropdown">
          <button type="button" class="user-dropdown-button" onclick="toggleUserDropdown()" aria-expanded="false">
            <span>${safeName}</span>
            <span class="arrow">${NAV_ICONS.chevronDown}</span>
          </button>
          <div class="user-dropdown-menu">
            <div class="user-dropdown-header">
              <div class="user-dropdown-top-row">
                <div class="user-dropdown-name">${safeName}</div>
                <span class="user-dropdown-role">${roleLabel}</span>
              </div>
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
              <button type="button" class="dropdown-action-button" onclick="goToMyPage()">
                ${NAV_ICONS.user}
                <span>마이페이지</span>
              </button>
              <button type="button" class="dropdown-action-button logout" onclick="AuthModule.logout()">
                ${NAV_ICONS.logout}
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const isOfficerOrAdmin = userData.role === 'officer' || userData.role === 'admin';
      const officeLink = document.getElementById('staffPageLink');
      if (officeLink) officeLink.style.display = isOfficerOrAdmin ? '' : 'none';

      const eventStaffLink = document.getElementById('eventStaffLink');
      if (eventStaffLink) eventStaffLink.style.display = isOfficerOrAdmin ? '' : 'none';
    } else {
      authArea.innerHTML = `<button type="button" class="login-button" onclick="AuthModule.goToLogin()">로그인</button>`;
    }
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    authArea.innerHTML = `<button type="button" class="login-button" onclick="AuthModule.goToLogin()">로그인</button>`;
  }
}

function goToMyPage() {
  window.location.href = '/mypage.html';
}

// 사이드바 토글 함수 (GPU translate + inert + aria-expanded)
function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('nav-btn-menu');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('is-open');
  const nextOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

  sidebar.classList.toggle('is-open', nextOpen);
  document.body.classList.toggle('sidebar-open', nextOpen);
  if (nextOpen) {
    sidebar.removeAttribute('inert');
  } else {
    sidebar.setAttribute('inert', '');
  }
  if (menuBtn) menuBtn.setAttribute('aria-expanded', String(nextOpen));
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
  const btn = document.getElementById('notif-toggle-btn');
  if (!panel) return;

  const willOpen = !panel.classList.contains('show');
  panel.classList.toggle('show', willOpen);
  if (btn) btn.setAttribute('aria-expanded', String(willOpen));

  if (willOpen) {
    const userMenu = document.querySelector('.user-dropdown-menu');
    const userBtn = document.querySelector('.user-dropdown-button');
    if (userMenu) userMenu.classList.remove('show');
    if (userBtn) userBtn.classList.remove('active');
    loadNotifications();
  }
}

async function refreshNotifBadge() {
  try {
    const res = await fetch('/notifications/unread-count', { credentials: 'include' });
    if (!res.ok) return;
    const { count } = await res.json();
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch (_) {}
}

function notifEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    items.forEach((n) => {
      const li = document.createElement('li');
      li.className = 'notif-item' + (n.isRead ? ' read' : ' unread');
      li.innerHTML =
        '<div class="notif-title">' + notifEscape(n.title) + '</div>' +
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

// 스타일과 네비게이션 삽입 (body 기준 — .container 유무와 무관하게 모든 페이지 동작)
document.addEventListener('DOMContentLoaded', function () {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'contenido-nav-styles';
  styleSheet.textContent = navStyles;
  document.head.appendChild(styleSheet);

  document.body.classList.add('has-global-nav');
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  document.body.insertAdjacentHTML('afterbegin', topNavHTML);
  document.body.insertAdjacentHTML('beforeend', bottomNavHTML);

  updateAuthArea();
  refreshNotifBadge();
  setInterval(refreshNotifBadge, 60 * 1000);

  // 현재 경로 활성 상태 표시 (하단 네비 + 사이드바)
  const currentPath = window.location.pathname;
  const homeBtn = document.getElementById('nav-btn-home');
  const myBtn = document.getElementById('nav-btn-mypage');

  if (currentPath === '/' || currentPath === '/index.html') {
    if (homeBtn) homeBtn.classList.add('active');
  } else if (currentPath === '/mypage.html') {
    if (myBtn) myBtn.classList.add('active');
  }

  document.querySelectorAll('#sidebar a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && (currentPath === href || (currentPath.endsWith(href) && href !== '/'))) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'page');
    }
  });
});

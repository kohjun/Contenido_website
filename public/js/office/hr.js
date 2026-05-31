/* =====================================================================
   hr.js — 인사팀 관리 페이지 로직 (v20260539)
   ---------------------------------------------------------------------
   IIFE 패턴 — 이 파일은 다음 두 환경 모두에서 동작해야 함:
   (1) office_hr.html 직접 로드: defer 없이 body 끝에서 실행
   (2) office.html → 사이드바 인사팀 클릭 → sidebar.js가 DOM 주입 후
       동적으로 <script src="..."> 삽입. 이 시점 DOMContentLoaded는
       이미 fired. 또 사이드바를 두 번 누르면 같은 코드가 재실행됨.
   ===================================================================== */
(function () {
  'use strict';
  console.log('[hr.js] loaded — version 20260539');

/* ───────── 전역 상태 ───────── */
const state = {
  allUsers: [],            // 서버에서 받은 전체
  selectedIds: new Set(),  // 선택된 userId
  filters: {
    search: '',
    role: 'all',
    active: 'all',
    gender: 'all',
    warning: 'all'
  },
  sortMode: 'name-asc',
  page: 1,
  perPage: 20,
  // 현재 선택된 user (단일 행동: 역할 변경, 팀 변경 등)
  contextUserId: null,
  // 경고 모달 컨텍스트
  warningTargetId: null,
  // 일괄 처리 컨텍스트
  bulkActionType: null,
  bulkSource: null,          // 'main' | 'monthly' — 일괄경고 출처(메인 리스트 vs 월간현황 패널)
  maSelected: new Set(),     // 월간 신청 현황 패널에서 체크된 회원 id
  // 현재 사용자의 HR 권한 (admin 또는 officer+인사팀)
  canManage: false
};

const TEAM_KOR = {
  operationTeam: '운영팀',
  HumanResourceTeam: '인사팀',
  financeTeam: '재무팀',
  cooperationTeam: '대외협력팀',
  marketingTeam: '홍보팀',
  designTeam: '디자인팀',
  videoTeam: '영상제작팀',
  PlanningTeam: '기획팀',
  regularTeam: '정기모임팀',
  staffTeam: '스태프팀',
  starterTeam: '스타터팀',
  noTeam: '없음'
};

const TEAM_CODE = {
  operationTeam: 'O',
  HumanResourceTeam: 'H',
  financeTeam: 'F',
  cooperationTeam: 'CO',
  marketingTeam: 'M',
  designTeam: 'D',
  videoTeam: 'V',
  PlanningTeam: 'P',
  regularTeam: 'R',
  staffTeam: 'S',
  starterTeam: 'St'
};

const ROLE_KOR = {
  admin: '관리자',
  officer: '운영진',
  staffTeam: '스태프',
  participant: '참가자',
  starter: '스타터',
  guest: '게스트'
};

/* ───────── 부팅 ───────── */
function bootHR() {
  // HR DOM이 실제로 존재하는지 확인 — sidebar.js가 인사팀 외 다른 페이지를
  // 표시하는 동안 캐시된 hr.js가 우연히 실행될 가능성 차단.
  if (!document.getElementById('role-chips')) {
    console.log('[hr.js] HR DOM not found — skipping init');
    return;
  }
  bindFilterChips();
  bindSearchInput();
  bindSortSelect();
  bindRoleOptionGrid();
  bindTeamOptionGrid();
  bindStaffOptionGrid();
  checkHRPermission();
  loadUsers();
  initMonthlyApply();
}

/* ───────── 현재 사용자의 HR 권한 체크 ─────────
   admin 또는 (officer + team='HumanResourceTeam') 만 회원 관리 기능 사용 가능 */
async function checkHRPermission() {
  try {
    const res = await fetch('/user/info', { credentials: 'include' });
    if (!res.ok) {
      state.canManage = false;
      applyPermissionToUI();
      return;
    }
    const me = await res.json();
    const isAdmin = me.role === 'admin';
    const isHROfficer = me.role === 'officer' && me.team === 'HumanResourceTeam';
    state.canManage = isAdmin || isHROfficer;
    applyPermissionToUI();
  } catch (e) {
    console.error('권한 확인 실패:', e);
    state.canManage = false;
    applyPermissionToUI();
  }
}

function applyPermissionToUI() {
  // 권한 없으면 일괄 작업 바를 영구히 숨기고 readonly 배너 표시
  const bulkBar = document.getElementById('bulk-bar');
  if (bulkBar && !state.canManage) {
    bulkBar.style.display = 'none';
  }
  // 읽기 전용 알림 배너
  if (!state.canManage && !document.getElementById('readonly-banner')) {
    const banner = document.createElement('div');
    banner.id = 'readonly-banner';
    banner.style.cssText = 'background:#FEF3C7;color:#92400E;padding:10px 14px;border-radius:12px;margin-bottom:16px;font-size:0.85rem;text-align:center;border:1px solid #FDE68A;';
    banner.textContent = '👀 읽기 전용 모드 — 회원 관리 기능은 관리자 또는 인사팀 운영진만 사용할 수 있습니다.';
    const filterCard = document.querySelector('.filter-card');
    if (filterCard) filterCard.parentNode.insertBefore(banner, filterCard);
  }
}

/* ───────── 월간 신청 현황 (이번 달 이벤트 · 1~5일 신청) ───────── */
let _monthlyApplyLoaded = false;
function _maEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function initMonthlyApply() {
  const toggle = document.getElementById('monthly-apply-toggle');
  const panel = document.getElementById('monthly-apply-panel');
  const chev = document.getElementById('monthly-apply-chev');
  if (!toggle || !panel) return;
  // 사이드바 경유 로드 시 bootHR가 두 번 호출돼(IIFE 자동부팅 + window.bootHR)
  // 같은 토글에 클릭 핸들러가 중복 바인딩되면 클릭이 열렸다 바로 닫힘 → 한 번만 바인딩
  if (toggle.dataset.maBound === '1') return;
  toggle.dataset.maBound = '1';
  toggle.addEventListener('click', () => {
    const willOpen = panel.hasAttribute('hidden');
    if (willOpen) {
      panel.removeAttribute('hidden');
      if (chev) chev.textContent = '▴';
      loadMonthlyApply(); // 열 때마다 최신으로 (1~5일 중에도 실시간 반영)
    } else {
      panel.setAttribute('hidden', '');
      if (chev) chev.textContent = '▾';
    }
  });
}
async function loadMonthlyApply() {
  const summary = document.getElementById('ma-summary');
  const cols = document.getElementById('ma-cols');
  try {
    const res = await fetch('/user/monthly-application-status', { credentials: 'include' });
    if (!res.ok) {
      let msg;
      if (res.status === 403) msg = '권한이 없습니다 (인사팀 운영진/관리자 전용).';
      else if (res.status === 401) msg = '로그인이 필요합니다. 다시 로그인해 주세요. (401)';
      else if (res.status === 404) msg = '엔드포인트를 찾을 수 없습니다 — 서버 재시작이 필요합니다. (404)';
      else msg = `신청 현황을 불러오지 못했습니다. (HTTP ${res.status})`;
      if (summary) summary.textContent = msg;
      console.warn('[monthly-apply] 조회 실패:', res.status);
      return;
    }
    const d = await res.json();
    _monthlyApplyLoaded = true;
    state.maMonth = `${d.year}-${String(d.month).padStart(2, '0')}`;
    state.maCanWarn = !!d.windowClosed && (d.eventCount || 0) > 0;
    state.maWarnReason = (d.eventCount || 0) === 0 ? '이번 달 이벤트가 없어 경고를 부여할 수 없습니다.'
                       : !d.windowClosed ? '신청 기간 진행 중 — 6일 이후 경고할 수 있습니다.'
                       : '';
    const note = d.windowClosed ? '' : ' · 신청 기간 진행 중 (6일 확정)';
    const exemptNote = d.exemptCount ? ` · 신규가입 면제 ${d.exemptCount}명` : '';
    if (summary) summary.innerHTML =
      `${d.year}년 ${d.month}월 · 이벤트 ${d.eventCount}개 · ` +
      `신청 <b style="color:#0A84FE">${d.appliedCount}</b> / ` +
      `지각 <b style="color:#D97706">${d.lateCount || 0}</b> / ` +
      `미신청 <b style="color:#EF4444">${d.notAppliedCount}</b>${exemptNote}${note}`;
    const lateBadge = (iso) => {
      if (!iso) return '';
      const dt = new Date(iso);
      return `<span style="color:#B45309;font-weight:600;font-size:.74rem;margin-left:4px;">${dt.getMonth() + 1}/${dt.getDate()} 신청</span>`;
    };
    const liHTML = (arr, selectable) => arr.length
      ? arr.map(m => {
          const cb = selectable ? `<input type="checkbox" class="ma-check" data-ma-id="${m.id}" onclick="maToggleOne('${m.id}', this.checked)">` : '';
          const phone = m.phoneTail ? `<span style="color:#94A3B8;font-weight:500;font-size:.8rem;margin-left:2px;">(${_maEsc(m.phoneTail)})</span>` : '';
          return `<li>${cb}<span class="ma-name">${_maEsc(m.name)}${phone}</span>${m.lateAt ? lateBadge(m.lateAt) : ''}${m.role === 'starter' ? '<span class="ma-tag">스타터</span>' : ''}</li>`;
        }).join('')
      : '<li class="ma-empty">없음</li>';
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setHTML = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
    setText('ma-applied-count', d.appliedCount);
    setText('ma-late-count', d.lateCount || 0);
    setText('ma-notapplied-count', d.notAppliedCount);
    setHTML('ma-applied-list', liHTML(d.applied, false));        // 신청 완료는 선택 불필요
    setHTML('ma-late-list', liHTML(d.lateApplied || [], true));  // 지각 — 선택 가능
    setHTML('ma-notapplied-list', liHTML(d.notApplied, true));   // 미신청 — 선택 가능
    // 재조회 시 선택 초기화
    state.maSelected.clear();
    document.querySelectorAll('.ma-selectall').forEach(c => { c.checked = false; });
    updateMaBar();
    if (cols) cols.removeAttribute('hidden');
  } catch (e) {
    console.error('월간 신청 현황 로드 실패:', e);
    if (summary) summary.textContent = '오류가 발생했습니다.';
  }
}

/* 월간 신청 현황 — 선택(개별/전체) + 선택 인원 일괄 경고 */
function updateMaBar() {
  const n = state.maSelected.size;
  const bar = document.getElementById('ma-bulk-bar');
  const cnt = document.getElementById('ma-bulk-count');
  const btn = document.getElementById('ma-warn-btn');
  const noteEl = document.getElementById('ma-warn-note');
  if (cnt) cnt.textContent = n;
  if (bar) bar.style.display = n > 0 ? 'flex' : 'none';
  if (btn) { btn.disabled = !state.maCanWarn; btn.title = state.maCanWarn ? '' : (state.maWarnReason || ''); }
  if (noteEl) noteEl.textContent = state.maCanWarn ? '' : (state.maWarnReason || '');
}
function maToggleOne(id, checked) {
  if (checked) state.maSelected.add(id); else state.maSelected.delete(id);
  updateMaBar();
}
function maToggleAll(listId, checked) {
  document.querySelectorAll(`#${listId} .ma-check`).forEach(cb => {
    cb.checked = checked;
    const id = cb.dataset.maId;
    if (checked) state.maSelected.add(id); else state.maSelected.delete(id);
  });
  updateMaBar();
}
function openMonthlyWarning() {
  if (!state.canManage) { toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn'); return; }
  if (state.maSelected.size === 0) { toast('선택된 회원이 없습니다', 'warn'); return; }
  if (!state.maCanWarn) { toast(state.maWarnReason || '지금은 경고를 부여할 수 없습니다', 'warn'); return; }
  state.bulkActionType = 'addWarning';
  state.bulkSource = 'monthly';
  document.getElementById('bulk-dialog-title').textContent = '월간 미신청 경고 일괄 부여';
  document.getElementById('bulk-dialog-desc').textContent = `${state.maMonth} · 선택된 ${state.maSelected.size}명에게 경고를 부여합니다 (같은 달 중복은 자동 제외)`;
  document.getElementById('bulk-amount-field').style.display = 'none';
  document.getElementById('bulk-category-field').style.display = '';
  document.getElementById('bulk-reason-field').style.display = '';
  document.getElementById('bulk-reason').value = `${state.maMonth} 월간 이벤트 미신청`;
  document.getElementById('bulk-category').value = '월간미신청';
  const btn = document.getElementById('bulk-confirm-btn');
  btn.className = 'modal-btn danger';
  btn.textContent = '경고 부여';
  openDialog('bulkDialog');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHR);
} else {
  // DOMContentLoaded 이미 지난 시점 (sidebar.js가 늦게 주입한 경우)
  bootHR();
}

/* ───────── 1. 데이터 로딩 ───────── */
async function loadUsers() {
  try {
    const res = await fetch('/user/participants/users', { credentials: 'include' });
    if (!res.ok) throw new Error('회원 정보를 불러오지 못했습니다');
    const users = await res.json();
    state.allUsers = users.map(u => ({
      ...u,
      _participation: (u.participationCount && (u.participationCount.regularCount || 0)) || 0,
      _warning: u.warningCount || 0
    }));

    updateStats();
    updateRoleCounts();
    applyFiltersAndRender();
  } catch (err) {
    console.error('loadUsers error:', err);
    toast('회원 정보를 불러오지 못했습니다', 'error');
  }
}

/* ───────── 2. 통계 ───────── */
function updateStats() {
  const all = state.allUsers;
  const active = all.filter(u => u.active).length;
  const inactive = all.length - active;
  const warnTotal = all.reduce((sum, u) => sum + (u.warningCount || 0), 0);

  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-inactive').textContent = inactive;
  document.getElementById('stat-warning').textContent = warnTotal;

  document.getElementById('total-count').textContent = all.length;
}

function updateRoleCounts() {
  const counts = { all: state.allUsers.length };
  state.allUsers.forEach(u => {
    const r = u.role || 'guest';
    counts[r] = (counts[r] || 0) + 1;
  });
  document.querySelectorAll('.chip-count').forEach(el => {
    const key = el.dataset.count;
    el.textContent = counts[key] || 0;
  });
}

/* ───────── 3. 필터/검색 ───────── */
function bindFilterChips() {
  ['role-chips', 'active-chips', 'gender-chips', 'warning-chips'].forEach(groupId => {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      if (groupId === 'role-chips')     state.filters.role    = chip.dataset.role;
      if (groupId === 'active-chips')   state.filters.active  = chip.dataset.active;
      if (groupId === 'gender-chips')   state.filters.gender  = chip.dataset.gender;
      if (groupId === 'warning-chips')  state.filters.warning = chip.dataset.warning;
      state.page = 1;
      applyFiltersAndRender();
    });
  });
}

function bindSearchInput() {
  const input = document.getElementById('search-input');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.filters.search = input.value.trim().toLowerCase();
      state.page = 1;
      applyFiltersAndRender();
    }, 200);
  });
}

function bindSortSelect() {
  const sel = document.getElementById('sort-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    state.sortMode = sel.value;
    applyFiltersAndRender();
  });
}

function resetAllFilters() {
  state.filters = { search: '', role: 'all', active: 'all', gender: 'all', warning: 'all' };
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.chip-group').forEach(group => {
    const chips = group.querySelectorAll('.chip');
    chips.forEach(c => c.classList.remove('is-active'));
    if (chips[0]) chips[0].classList.add('is-active');
  });
  state.sortMode = 'name-asc';
  document.getElementById('sort-select').value = 'name-asc';
  state.page = 1;
  applyFiltersAndRender();
}

/* ───────── 4. 필터 적용 ───────── */
function getFilteredUsers() {
  const f = state.filters;
  return state.allUsers.filter(u => {
    // 역할
    if (f.role !== 'all' && u.role !== f.role) return false;
    // 활성
    if (f.active === 'active' && !u.active) return false;
    if (f.active === 'inactive' && u.active) return false;
    // 성별
    if (f.gender !== 'all' && (u.gender || '') !== f.gender) return false;
    // 경고
    const wc = u.warningCount || 0;
    if (f.warning === 'none' && wc !== 0) return false;
    if (f.warning === 'hasWarn' && wc < 1) return false;
    if (f.warning === 'high' && wc < 3) return false;
    // 검색어 (이름/대학/전화 끝4자리)
    if (f.search) {
      const last4 = (u.phonenumber || '').slice(-4);
      const blob = [
        u.name || '',
        u.displayName || '',
        u.university || '',
        u.department || '',
        last4
      ].join(' ').toLowerCase();
      if (!blob.includes(f.search)) return false;
    }
    return true;
  });
}

// 이름이 비어있거나 '-' 인 경우는 항상 맨 뒤로 빠지도록
function isNamelessUser(u) {
  const n = (u && u.name ? String(u.name).trim() : '');
  return n === '' || n === '-';
}

function sortUsers(arr) {
  const m = state.sortMode;
  const sorted = [...arr];
  sorted.sort((a, b) => {
    // 이름 없는(또는 '-') 사용자는 정렬 모드와 관계없이 항상 맨 뒤
    const aNameless = isNamelessUser(a);
    const bNameless = isNamelessUser(b);
    if (aNameless && !bNameless) return 1;
    if (!aNameless && bNameless) return -1;

    switch (m) {
      case 'name-asc':       return (a.name || '').localeCompare(b.name || '', 'ko');
      case 'name-desc':      return (b.name || '').localeCompare(a.name || '', 'ko');
      case 'createdAt-desc': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'createdAt-asc':  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'warning-desc':   return (b.warningCount || 0) - (a.warningCount || 0);
      case 'warning-asc':    return (a.warningCount || 0) - (b.warningCount || 0);
      case 'regular-desc':   return b._participation - a._participation;
      case 'regular-asc':    return a._participation - b._participation;
      default: return 0;
    }
  });
  return sorted;
}

function getPageUsers(filtered) {
  const start = (state.page - 1) * state.perPage;
  return filtered.slice(start, start + state.perPage);
}

/* ───────── 5. 렌더 ───────── */
function applyFiltersAndRender() {
  const filtered = sortUsers(getFilteredUsers());
  document.getElementById('filtered-count').textContent = filtered.length;

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / state.perPage));
  if (state.page > maxPage) state.page = maxPage;

  const pageUsers = getPageUsers(filtered);
  renderTable(pageUsers);
  renderCards(pageUsers);
  renderPagination(total);
  updateBulkBar();
}

function renderListOnly() {
  const filtered = sortUsers(getFilteredUsers());
  const pageUsers = getPageUsers(filtered);
  renderTable(pageUsers);
  renderCards(pageUsers);
}

function renderTable(users) {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state">
          <div class="emoji">🔍</div>
          <h3>조건에 맞는 회원이 없어요</h3>
          <p>검색어나 필터를 조정해보세요</p>
        </div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => userRowHTML(u)).join('');
  bindRowEvents();
}

function renderCards(users) {
  const wrap = document.getElementById('user-cards');
  if (!wrap) return;
  if (!users.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>조건에 맞는 회원이 없어요</h3>
        <p>검색어나 필터를 조정해보세요</p>
      </div>`;
    return;
  }
  wrap.innerHTML = users.map(u => userCardHTML(u)).join('');
  bindCardEvents();
}

function userRowHTML(u) {
  const isSel = state.selectedIds.has(u.id);
  const teamKor = u.team ? (TEAM_KOR[u.team] || '없음') : '없음';
  const teamCode = u.team ? (TEAM_CODE[u.team] || '') : '';
  const roleClass = `role-${(u.role || 'guest').toLowerCase()}`;
  const profile = u.profileImage || '/profile-images/default.png';
  const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-';
  const gender = u.gender === 'male' ? '남' : u.gender === 'female' ? '여' : '-';
  const warnHasClass = (u.warningCount || 0) > 0 ? 'has-warn' : '';

  return `
    <tr data-id="${u.id}" class="${isSel ? 'is-selected' : ''}">
      <td class="col-check">
        <input type="checkbox" class="row-check" data-id="${u.id}" ${isSel ? 'checked' : ''}>
      </td>
      <td class="col-profile">
        <img class="profile-image" src="${escapeAttr(profile)}" alt="profile"
             onclick="window.location.href='profile.html?userId=${u.id}'">
      </td>
      <td>
        <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
          <strong>${escapeHTML(u.name || '-')}${u.phonenumber ? '(' + u.phonenumber.slice(-4) + ')' : ''}</strong>
          ${u.displayName ? `<span style="font-size:0.75rem; color:var(--c-text-soft);">${escapeHTML(u.displayName)}</span>` : ''}
        </div>
      </td>
      <td>
        <span class="role-pill ${roleClass} ${u.role === 'admin' ? 'is-locked' : ''}" data-id="${u.id}" data-action="role" title="${u.role === 'admin' ? '관리자 역할은 변경 불가' : '클릭하여 역할 변경'}">
          ${ROLE_KOR[u.role] || '게스트'}${u.role === 'admin' ? ' 🔒' : ''}
        </span>
      </td>
      <td>
        ${teamKor === '없음'
          ? `<span class="no-team" data-id="${u.id}" data-action="team">없음</span>`
          : `<span class="team-pill" data-team="${teamCode}" data-id="${u.id}" data-action="team">${teamKor}</span>`}
      </td>
      <td><span class="gender-chip">${gender}</span></td>
      <td>${escapeHTML(u.university || '-')}</td>
      <td>
        <div class="count-cell">
          <input type="number" min="0" class="count-input warning-input ${warnHasClass}"
                 data-id="${u.id}" data-field="warning" value="${u.warningCount || 0}">
          <button class="warning-link" data-id="${u.id}" data-action="warning-add">+</button>
          <button class="warning-link" data-id="${u.id}" data-action="warning-list">목록</button>
        </div>
      </td>
      <td>
        <div class="count-cell">
          <input type="number" min="0" class="count-input"
                 data-id="${u.id}" data-field="participation" value="${u._participation}">
        </div>
      </td>
      <td>
        <label class="active-toggle">
          <input type="checkbox" data-id="${u.id}" data-action="toggle-active" ${u.active ? 'checked' : ''}>
          <span class="active-slider"></span>
        </label>
      </td>
      <td style="font-size:0.8rem; color:var(--c-text-muted);">${date}</td>
    </tr>`;
}

function userCardHTML(u) {
  const isSel = state.selectedIds.has(u.id);
  const teamKor = u.team ? (TEAM_KOR[u.team] || '없음') : '없음';
  const teamCode = u.team ? (TEAM_CODE[u.team] || '') : '';
  const roleClass = `role-${(u.role || 'guest').toLowerCase()}`;
  const profile = u.profileImage || '/profile-images/default.png';
  const gender = u.gender === 'male' ? '남' : u.gender === 'female' ? '여' : '-';
  const last4 = u.phonenumber ? u.phonenumber.slice(-4) : '';
  const hasWarn = (u.warningCount || 0) > 0;

  return `
    <div class="user-card ${isSel ? 'is-selected' : ''}" data-id="${u.id}">
      <!-- Row 1: 체크 / 아바타 / 이름 / 활성토글 -->
      <div class="card-row-main">
        <input type="checkbox" class="user-card-check row-check" data-id="${u.id}" ${isSel ? 'checked' : ''}>
        <img class="user-card-avatar" src="${escapeAttr(profile)}" alt="profile"
             onclick="window.location.href='profile.html?userId=${u.id}'">
        <div class="user-card-name">
          <h4>${escapeHTML(u.name || '-')}${last4 ? `<span class="last4">(${last4})</span>` : ''}</h4>
          <div class="sub">${escapeHTML(u.university || '-')} · ${gender}</div>
        </div>
        <label class="active-toggle">
          <input type="checkbox" data-id="${u.id}" data-action="toggle-active" ${u.active ? 'checked' : ''}>
          <span class="active-slider"></span>
        </label>
      </div>

      <!-- Row 2: 역할/팀 pills + 경고/참가 numbers + 액션 -->
      <div class="card-row-meta">
        <span class="role-pill ${roleClass} ${u.role === 'admin' ? 'is-locked' : ''}" data-id="${u.id}" data-action="role">
          ${ROLE_KOR[u.role] || '게스트'}${u.role === 'admin' ? ' 🔒' : ''}
        </span>
        ${teamKor === '없음'
          ? `<span class="no-team" data-id="${u.id}" data-action="team">팀없음</span>`
          : `<span class="team-pill" data-team="${teamCode}" data-id="${u.id}" data-action="team">${teamKor}</span>`}
        <span class="mini-stat ${hasWarn ? 'warn' : ''}" data-id="${u.id}" data-action="warning-list" title="경고 내역">
          ⚠ ${u.warningCount || 0}
        </span>
        <span class="mini-stat">
          참가 <input type="number" min="0" class="count-input-inline"
                     data-id="${u.id}" data-field="participation" value="${u._participation}">
        </span>
        <button class="icon-action" type="button" data-id="${u.id}" data-action="warning-add" title="경고 부여">⚠+</button>
      </div>
    </div>`;
}

/* ───────── 6. 이벤트 바인딩 ───────── */
function bindRowEvents() {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  tbody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      e.target.closest('tr')?.classList.toggle('is-selected', e.target.checked);
      updateBulkBar();
    });
  });

  tbody.querySelectorAll('[data-action="role"]').forEach(el => {
    el.addEventListener('click', () => openRoleDialog(el.dataset.id));
  });

  tbody.querySelectorAll('[data-action="team"]').forEach(el => {
    el.addEventListener('click', () => openTeamDialog(el.dataset.id));
  });

  tbody.querySelectorAll('[data-action="warning-add"]').forEach(el => {
    el.addEventListener('click', () => openWarningModal(el.dataset.id));
  });

  tbody.querySelectorAll('[data-action="warning-list"]').forEach(el => {
    el.addEventListener('click', () => openWarningHistory(el.dataset.id));
  });

  tbody.querySelectorAll('[data-action="toggle-active"]').forEach(el => {
    el.addEventListener('change', e => {
      toggleUserActive(e.target.dataset.id, e.target.checked);
    });
  });

  tbody.querySelectorAll('input[data-field="participation"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const val = parseInt(inp.value);
      if (!Number.isNaN(val) && val >= 0) {
        updateParticipation(inp.dataset.id, val);
      } else {
        inp.value = state.allUsers.find(u => u.id === inp.dataset.id)?._participation || 0;
      }
    });
  });

  tbody.querySelectorAll('input[data-field="warning"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const val = parseInt(inp.value);
      const original = state.allUsers.find(u => u.id === inp.dataset.id)?.warningCount || 0;
      if (val === original) return;
      inp.value = original;
      toast('경고 횟수는 [+] 버튼으로 추가하거나 내역에서 삭제해주세요', 'warn');
    });
  });
}

function bindCardEvents() {
  const wrap = document.getElementById('user-cards');
  if (!wrap) return;

  wrap.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      e.target.closest('.user-card')?.classList.toggle('is-selected', e.target.checked);
      updateBulkBar();
    });
  });

  wrap.querySelectorAll('[data-action="role"]').forEach(el => {
    el.addEventListener('click', () => openRoleDialog(el.dataset.id));
  });
  wrap.querySelectorAll('[data-action="team"]').forEach(el => {
    el.addEventListener('click', () => openTeamDialog(el.dataset.id));
  });
  wrap.querySelectorAll('[data-action="warning-add"]').forEach(el => {
    el.addEventListener('click', () => openWarningModal(el.dataset.id));
  });
  wrap.querySelectorAll('[data-action="warning-list"]').forEach(el => {
    el.addEventListener('click', () => openWarningHistory(el.dataset.id));
  });
  wrap.querySelectorAll('[data-action="toggle-active"]').forEach(el => {
    el.addEventListener('change', e => {
      toggleUserActive(e.target.dataset.id, e.target.checked);
    });
  });
  wrap.querySelectorAll('input[data-field="participation"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const val = parseInt(inp.value);
      if (!Number.isNaN(val) && val >= 0) {
        updateParticipation(inp.dataset.id, val);
      } else {
        inp.value = state.allUsers.find(u => u.id === inp.dataset.id)?._participation || 0;
      }
    });
  });
  wrap.querySelectorAll('input[data-field="warning"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const val = parseInt(inp.value);
      const original = state.allUsers.find(u => u.id === inp.dataset.id)?.warningCount || 0;
      if (val === original) return;
      inp.value = original;
      toast('경고는 [경고] 버튼으로 추가해주세요', 'warn');
    });
  });
}

/* ───────── 7. 페이지네이션 ───────── */
function renderPagination(total) {
  const wrap = document.getElementById('pagination');
  if (!wrap) return;
  const maxPage = Math.max(1, Math.ceil(total / state.perPage));
  if (maxPage <= 1) {
    wrap.innerHTML = '';
    return;
  }
  const cur = state.page;
  const items = [];
  items.push(`<button ${cur === 1 ? 'disabled' : ''} onclick="changePage(${cur - 1})">‹</button>`);
  const win = 2;
  for (let i = 1; i <= maxPage; i++) {
    if (i === 1 || i === maxPage || (i >= cur - win && i <= cur + win)) {
      items.push(`<button class="${i === cur ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`);
    } else if (i === cur - win - 1 || i === cur + win + 1) {
      items.push(`<button disabled>…</button>`);
    }
  }
  items.push(`<button ${cur === maxPage ? 'disabled' : ''} onclick="changePage(${cur + 1})">›</button>`);
  wrap.innerHTML = items.join('');
}

function changePage(p) {
  state.page = p;
  applyFiltersAndRender();
}

/* ───────── 8. 단일 행 액션 ───────── */
async function updateParticipation(userId, count) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    return;
  }
  try {
    const res = await fetch(`/user/update-participation/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regularCount: count })
    });
    if (!res.ok) throw new Error('업데이트 실패');
    const u = state.allUsers.find(x => x.id === userId);
    if (u) {
      u._participation = count;
      u.participationCount = u.participationCount || {};
      u.participationCount.regularCount = count;
    }
    toast(`참여 횟수: ${count}회로 변경됨`, 'success');
    flashRow(userId);
  } catch (e) {
    console.error(e);
    toast('참여 횟수 업데이트 실패', 'error');
  }
}

async function toggleUserActive(userId, active) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    // 토글 시각 상태 되돌리기
    const cb = document.querySelector(`input[data-id="${userId}"][data-action="toggle-active"]`);
    if (cb) cb.checked = !active;
    return;
  }
  try {
    const res = await fetch(`/user/toggle-active/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    if (!res.ok) throw new Error('상태 변경 실패');
    const u = state.allUsers.find(x => x.id === userId);
    if (u) u.active = active;
    updateStats();
    toast(active ? '활성화됨' : '비활성화됨', 'success');
    flashRow(userId);
  } catch (e) {
    console.error(e);
    toast('상태 변경 실패', 'error');
  }
}

function flashRow(userId) {
  document.querySelectorAll(`tr[data-id="${userId}"]`).forEach(tr => {
    tr.classList.remove('recently-modified');
    void tr.offsetWidth;
    tr.classList.add('recently-modified');
  });
}

/* ───────── 9. 역할 변경 ───────── */
function bindRoleOptionGrid() {
  const grid = document.getElementById('role-option-grid');
  if (!grid) return;
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    grid.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById('roleSelect').value = btn.dataset.value;
    // officer 선택 시에만 팀 picker 노출
    toggleRoleTeamField(btn.dataset.value);
  });

  // 다이얼로그 내 팀 picker
  const teamGrid = document.getElementById('role-team-grid');
  if (teamGrid) {
    teamGrid.addEventListener('click', e => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      teamGrid.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById('roleTeamSelect').value = btn.dataset.value;
    });
  }
}

function toggleRoleTeamField(role) {
  const wrap = document.getElementById('role-team-field');
  if (!wrap) return;
  wrap.style.display = role === 'officer' ? '' : 'none';
}

function openRoleDialog(userId) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    return;
  }
  const u = state.allUsers.find(x => x.id === userId);
  // 관리자(admin) 역할 변경 차단
  if (u && u.role === 'admin') {
    toast('관리자(admin) 역할은 변경할 수 없습니다', 'warn');
    return;
  }
  state.contextUserId = userId;
  const cur = (u && u.role) || 'participant';
  const grid = document.getElementById('role-option-grid');
  grid.querySelectorAll('button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.value === cur);
  });
  document.getElementById('roleSelect').value = cur;

  // 팀 picker 초기화 — 현재 팀이 있으면 미리 선택
  const curTeam = (u && u.team) || '';
  const teamGrid = document.getElementById('role-team-grid');
  if (teamGrid) {
    teamGrid.querySelectorAll('button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.value === curTeam);
    });
  }
  document.getElementById('roleTeamSelect').value = curTeam;
  toggleRoleTeamField(cur);

  openDialog('roleChangeDialog');
}

async function updateUserRole() {
  const userId = state.contextUserId;
  if (!userId) return;
  const newRole = document.getElementById('roleSelect').value;
  const body = { role: newRole };
  if (newRole === 'officer') {
    const newTeam = document.getElementById('roleTeamSelect').value;
    if (!newTeam) {
      toast('운영진은 팀을 선택해주세요', 'warn');
      return;
    }
    body.team = newTeam;
  }
  try {
    const res = await fetch(`/user/update-role/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '역할 변경 실패');
    }
    const data = await res.json();
    const u = state.allUsers.find(x => x.id === userId);
    if (u) {
      u.role = newRole;
      u.team = data.team || (newRole === 'officer' ? body.team : undefined);
      u.department = data.department;
      if (typeof data.active === 'boolean') u.active = data.active;
    }
    closeDialog('roleChangeDialog');
    updateStats();
    updateRoleCounts();
    applyFiltersAndRender();
    let msg = `역할: ${ROLE_KOR[newRole]}로 변경됨`;
    if (data.autoActivated) msg += ' · 활성화됨';
    toast(msg, 'success');
  } catch (e) {
    console.error(e);
    toast(e.message || '역할 변경 실패', 'error');
  }
}

/* ───────── 10. 팀 변경 ───────── */
function bindTeamOptionGrid() {
  const grid = document.getElementById('team-option-grid');
  if (!grid) return;
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    grid.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById('teamSelect').value = btn.dataset.value;
  });
}

function openTeamDialog(userId) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    return;
  }
  state.contextUserId = userId;
  const u = state.allUsers.find(x => x.id === userId);
  const cur = (u && u.team) || 'operationTeam';
  const grid = document.getElementById('team-option-grid');
  grid.querySelectorAll('button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.value === cur);
  });
  document.getElementById('teamSelect').value = cur;
  openDialog('teamChangeDialog');
}

async function updateUserTeam() {
  const userId = state.contextUserId;
  if (!userId) return;
  const newTeam = document.getElementById('teamSelect').value;
  try {
    const res = await fetch(`/user/update-team/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: newTeam })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '팀 변경 실패');
    }
    const data = await res.json();
    const u = state.allUsers.find(x => x.id === userId);
    if (u) {
      u.team = newTeam;
      if (data.department) u.department = data.department;
    }
    closeDialog('teamChangeDialog');
    applyFiltersAndRender();
    toast(`팀: ${TEAM_KOR[newTeam]}로 변경됨`, 'success');
  } catch (e) {
    console.error(e);
    toast(e.message || '팀 변경 실패', 'error');
  }
}

/* ───────── 11. 스태프 소그룹 ───────── */
function bindStaffOptionGrid() {
  const grid = document.getElementById('staff-option-grid');
  if (!grid) return;
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    grid.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById('staffSubteamModalSelect').value = btn.dataset.value;
  });
}

async function confirmStaffSubteamOnly() {
  const userId = state.contextUserId;
  if (!userId) return;
  const sub = document.getElementById('staffSubteamModalSelect').value;
  if (!sub) {
    toast('소그룹을 선택해주세요', 'warn');
    return;
  }
  try {
    const res = await fetch(`/user/update-staffsubteam/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffSubteam: sub })
    });
    if (!res.ok) throw new Error('소그룹 변경 실패');
    closeDialog('staffSubteamDialog');
    toast(`스태프 소그룹: ${sub}로 변경됨`, 'success');
  } catch (e) {
    console.error(e);
    toast('소그룹 변경 실패', 'error');
  }
}

/* ───────── 12. 경고 부여 / 내역 ───────── */
function openWarningModal(userId) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    return;
  }
  state.warningTargetId = userId;
  const u = state.allUsers.find(x => x.id === userId);
  document.getElementById('warning-target-name').textContent = u ? `· ${u.name}` : '';
  document.getElementById('warning-reason').value = '';
  document.getElementById('warning-category').value = '태도';
  openDialog('warningModal');
}

function closeWarningModal() { closeDialog('warningModal'); }

async function issueWarning() {
  const userId = state.warningTargetId;
  if (!userId) return;
  const reason = document.getElementById('warning-reason').value.trim();
  const category = document.getElementById('warning-category').value;
  if (!reason) { toast('사유를 입력해주세요', 'warn'); return; }

  try {
    const res = await fetch(`/user/issue-warning/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, category })
    });
    if (!res.ok) throw new Error('경고 부여 실패');
    const data = await res.json();
    const u = state.allUsers.find(x => x.id === userId);
    if (u) u.warningCount = data.warningCount;
    closeWarningModal();
    updateStats();
    applyFiltersAndRender();
    toast(`경고 부여 완료 (현재 ${data.warningCount}회)`, 'success');
  } catch (e) {
    console.error(e);
    toast('경고 부여 실패', 'error');
  }
}

async function openWarningHistory(userId) {
  state.warningTargetId = userId;
  const u = state.allUsers.find(x => x.id === userId);
  document.getElementById('warning-history-name').textContent = u ? `· ${u.name}` : '';
  document.getElementById('warning-history-body').innerHTML = '<div class="empty-state"><p>불러오는 중…</p></div>';
  openDialog('warningHistoryModal');
  try {
    const res = await fetch(`/user/warning-history/${userId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('내역 불러오기 실패');
    const data = await res.json();
    renderWarningHistory(data.warningHistory || data.warnings || []);
  } catch (e) {
    console.error(e);
    document.getElementById('warning-history-body').innerHTML = `<div class="empty-state"><p>내역을 불러오지 못했습니다</p></div>`;
  }
}

function closeWarningHistoryModal() { closeDialog('warningHistoryModal'); }

function renderWarningHistory(warnings) {
  const body = document.getElementById('warning-history-body');
  if (!warnings.length) {
    body.innerHTML = '<div class="empty-state"><div class="emoji">✨</div><h3>경고 내역이 없어요</h3><p>이 회원은 깨끗합니다</p></div>';
    return;
  }
  body.innerHTML = `<div class="warning-history-list">${warnings.map(w => `
    <div class="warning-item ${w.isActive ? '' : 'inactive'}">
      <div class="warning-item-top">
        <span class="warning-item-category">${escapeHTML(w.category || '기타')}</span>
        <span style="font-size:0.75rem; color:var(--c-text-muted);">${new Date(w.issuedAt).toLocaleString('ko-KR')}</span>
      </div>
      <div class="warning-item-reason">${escapeHTML(w.reason || '-')}</div>
      <div class="warning-item-meta">
        <span>부여: ${escapeHTML(w.issuedByName || '운영진')}${w.isActive ? '' : ' · <s>비활성</s>'}</span>
        ${w.isActive ? `<button onclick="removeWarning('${w.id || w._id}')">삭제</button>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

async function removeWarning(warningId) {
  const userId = state.warningTargetId;
  if (!userId) return;
  if (!confirm('이 경고를 비활성화할까요?')) return;
  try {
    const res = await fetch(`/user/remove-warning/${userId}/${warningId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '관리자 판단' })
    });
    if (!res.ok) throw new Error('경고 삭제 실패');
    const data = await res.json();
    const u = state.allUsers.find(x => x.id === userId);
    if (u) u.warningCount = data.warningCount;
    // reload history
    openWarningHistory(userId);
    updateStats();
    applyFiltersAndRender();
    toast('경고가 비활성화되었습니다', 'success');
  } catch (e) {
    console.error(e);
    toast('경고 삭제 실패', 'error');
  }
}

/* ───────── 13. 선택 / 일괄 처리 ───────── */
function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const count = state.selectedIds.size;
  document.getElementById('bulk-count').textContent = count;
  bar?.classList.toggle('is-visible', count > 0);
}

function clearSelection() {
  state.selectedIds.clear();
  document.querySelectorAll('.row-check').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.user-table tbody tr.is-selected').forEach(tr => tr.classList.remove('is-selected'));
  document.querySelectorAll('.user-card.is-selected').forEach(c => c.classList.remove('is-selected'));
  updateBulkBar();
}

function openBulkDialog(action) {
  if (!state.canManage) {
    toast('관리자 또는 인사팀 운영진만 사용할 수 있습니다', 'warn');
    return;
  }
  if (state.selectedIds.size === 0) {
    toast('선택된 회원이 없습니다', 'warn');
    return;
  }
  state.bulkActionType = action;
  state.bulkSource = 'main';
  const titleMap = {
    addParticipation: '참여 횟수 일괄 추가',
    subtractParticipation: '참여 횟수 일괄 차감',
    addWarning: '경고 일괄 부여'
  };
  const descMap = {
    addParticipation: `선택된 ${state.selectedIds.size}명의 정기 참여 횟수를 N회만큼 늘립니다`,
    subtractParticipation: `선택된 ${state.selectedIds.size}명의 정기 참여 횟수를 N회만큼 차감합니다 (최소 0)`,
    addWarning: `선택된 ${state.selectedIds.size}명에게 동일한 사유로 경고를 부여합니다`
  };
  document.getElementById('bulk-dialog-title').textContent = titleMap[action];
  document.getElementById('bulk-dialog-desc').textContent = descMap[action];

  const amountField = document.getElementById('bulk-amount-field');
  const categoryField = document.getElementById('bulk-category-field');
  const reasonField = document.getElementById('bulk-reason-field');

  if (action === 'addWarning') {
    amountField.style.display = 'none';
    categoryField.style.display = '';
    reasonField.style.display = '';
    document.getElementById('bulk-reason').value = '';
    document.getElementById('bulk-category').value = '태도';
    document.getElementById('bulk-confirm-btn').className = 'modal-btn danger';
    document.getElementById('bulk-confirm-btn').textContent = '경고 부여';
  } else {
    amountField.style.display = '';
    categoryField.style.display = 'none';
    reasonField.style.display = 'none';
    document.getElementById('bulk-amount').value = 1;
    document.getElementById('bulk-confirm-btn').className = 'modal-btn primary';
    document.getElementById('bulk-confirm-btn').textContent = '적용';
  }
  openDialog('bulkDialog');
}

async function submitBulkAction() {
  const action = state.bulkActionType;
  if (!action) return;
  const fromMonthly = state.bulkSource === 'monthly';
  const userIds = fromMonthly ? Array.from(state.maSelected) : Array.from(state.selectedIds);
  if (userIds.length === 0) { toast('선택된 회원이 없습니다', 'warn'); return; }

  const body = { userIds, action };

  if (action === 'addWarning') {
    body.category = document.getElementById('bulk-category').value;
    body.reason = document.getElementById('bulk-reason').value.trim();
    if (!body.reason) { toast('사유를 입력해주세요', 'warn'); return; }
    if (fromMonthly) body.targetMonth = state.maMonth; // 같은 달 중복 경고 방지
  } else {
    const amt = parseInt(document.getElementById('bulk-amount').value);
    if (!Number.isInteger(amt) || amt < 1) { toast('1 이상의 정수를 입력해주세요', 'warn'); return; }
    body.amount = amt;
  }

  try {
    document.getElementById('bulk-confirm-btn').disabled = true;
    const res = await fetch('/user/bulk-update', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '일괄 처리 실패');
    }
    const data = await res.json();
    closeDialog('bulkDialog');
    toast(data.message || `${data.processed}명 처리 완료`, 'success');
    if (fromMonthly) {
      state.maSelected.clear();
      updateMaBar();
      await loadUsers();   // 통계(경고 누적) 동기화
      loadMonthlyApply();  // 패널 갱신(경고 부여 후 최신)
    } else {
      clearSelection();
      await loadUsers();   // 데이터 다시 로드 (서버 상태 동기화)
    }
    state.bulkSource = null;
  } catch (e) {
    console.error(e);
    toast(e.message || '일괄 처리 실패', 'error');
  } finally {
    document.getElementById('bulk-confirm-btn').disabled = false;
  }
}

/* ───────── 14. 다이얼로그 헬퍼 ───────── */
function openDialog(id) {
  document.getElementById(id)?.classList.add('is-open');
}
function closeDialog(id) {
  document.getElementById(id)?.classList.remove('is-open');
}

// 오버레이 클릭으로 닫기
document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('is-open');
  }
});

// ESC로 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.is-open').forEach(o => o.classList.remove('is-open'));
  }
});

/* ───────── 15. 토스트 ───────── */
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast is-show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-show');
  }, 2400);
}

/* ───────── 16. 유틸 ───────── */
function escapeHTML(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(s) {
  return escapeHTML(s).replaceAll('`', '&#96;');
}

/* ───────── 외부 노출 ─────────
   HTML inline onclick="..." + sidebar.js의 typeof loadUsers === 'function'
   체크가 동작하도록 window에 노출. IIFE를 재실행해도 window.foo = newFoo로
   덮어쓰이므로 이전 클로저의 state는 자연스럽게 GC됨. */
window.resetAllFilters = resetAllFilters;
window.changePage = changePage;
window.openRoleDialog = openRoleDialog;
window.openTeamDialog = openTeamDialog;
window.openWarningModal = openWarningModal;
window.openWarningHistory = openWarningHistory;
window.closeWarningModal = closeWarningModal;
window.closeWarningHistoryModal = closeWarningHistoryModal;
window.updateUserRole = updateUserRole;
window.updateUserTeam = updateUserTeam;
window.confirmStaffSubteamOnly = confirmStaffSubteamOnly;
window.issueWarning = issueWarning;
window.removeWarning = removeWarning;
window.openBulkDialog = openBulkDialog;
window.submitBulkAction = submitBulkAction;
window.clearSelection = clearSelection;
window.openDialog = openDialog;
window.closeDialog = closeDialog;
// sidebar.js가 호출함
window.loadUsers = loadUsers;
window.bootHR = bootHR;
window.maToggleOne = maToggleOne;
window.maToggleAll = maToggleAll;
window.openMonthlyWarning = openMonthlyWarning;

})();

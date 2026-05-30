// public/js/events.js
// events.html 전용: 이벤트 목록(부채꼴 프리뷰 + 카드 그리드), 신청/취소, 삭제
// (이전에는 event-staff.html 관련 코드까지 한 파일에 섞여 있었음 → event-staff.js 로 분리)

let userId;
let currentPage = 1;
let eventsPerPage = 10;
let allEvents = [];

/* =========================================================================
   1) 데이터 로드
   ========================================================================= */

async function fetchEvents() {
  try {
    const response = await fetch('/events');
    const events = await response.json();
    allEvents = events;

    const userResponse = await fetch('/user/info');
    const currentUser = await userResponse.json();

    updateMonthHeader(allEvents, currentUser);
    renderFanPreview(allEvents);
    displayCurrentPage(currentUser);
  } catch (error) {
    console.error('Error fetching events:', error);
    const eventsList = document.getElementById('events-list');
    if (eventsList) {
      eventsList.innerHTML = `
        <div class="state">
          <div class="state-icon">😢</div>
          <p class="state-title">이벤트를 불러올 수 없어요</p>
          <p class="state-desc">로그인 후 다시 시도해주세요.</p>
        </div>
      `;
    }
    const fan = document.getElementById('fan-cards');
    if (fan) fan.innerHTML = '<div class="fan-empty">이벤트를 불러올 수 없어요.</div>';
  }
}

/* =========================================================================
   2) 유틸 / 아이콘
   ========================================================================= */

const ICONS = {
  cal:   '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clock: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  pin:   '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  users: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  won:   '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
};

function formatEventDate(d) {
  const dt = new Date(d);
  const days = '일월화수목금토';
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
}

function formatFee(event) {
  const min = (event.participation_fee || 0).toLocaleString();
  if (event.feeType === 'range' && event.participation_fee_max) {
    return `${min} ~ ${event.participation_fee_max.toLocaleString()}원`;
  }
  return `${min}원`;
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* =========================================================================
   3) 월 헤더 — "N월 이벤트" + 신청기간 + D-N 마감 배지
   ========================================================================= */

function updateMonthHeader(events, currentUser) {
  const titleEl = document.getElementById('page-month-title');
  const metaEl  = document.getElementById('month-meta');
  if (!titleEl) return;

  const now = new Date();
  const month = now.getMonth();   // 0-indexed
  const monthNum = month + 1;
  const day = now.getDate();

  // 제목: "N월 이벤트"
  titleEl.textContent = `${monthNum}월 이벤트`;

  if (!metaEl) return;

  // 신청기간: 매월 1일 ~ 5일 (고정)
  const periodText = `${monthNum}월 1일 ~ ${monthNum}월 5일`;
  const isClosed = day > 5;

  // 이번 달 이벤트 신청 여부 (항상 계산해서 사용자 상태 pill 표시)
  const year = now.getFullYear();
  const monthEvents = (events || []).filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const uid = currentUser && (currentUser.id || currentUser._id);
  const hasApplied = !!uid && monthEvents.some(e =>
    (e.appliedParticipants || []).some(p => {
      const pid = (p.userId && typeof p.userId === 'object') ? p.userId._id : p.userId;
      return String(pid) === String(uid);
    })
  );

  const userPillHtml = hasApplied
    ? `<span class="pill pill-success">${monthNum}월 이벤트 신청 완료</span>`
    : `<span class="pill pill-warning">미신청 상태, 경고 1회 부여 가능</span>`;

  // 6일 이후엔 신청 마감 pill을 사용자 pill 위에 추가
  const closedPillHtml = isClosed
    ? `<span class="pill pill-closed">신청 마감</span>`
    : '';

  metaEl.innerHTML =
    `<span class="meta-line">신청기간 <b>${periodText}</b> · 최소 1개 이상 신청 ${closedPillHtml}</span>` +
    `<span class="meta-line meta-line-status">${userPillHtml}</span>`;
  metaEl.classList.remove('is-hidden');
}

/* =========================================================================
   4) 부채꼴 프리뷰 (이번 달 이벤트)
   ========================================================================= */

function fanAngle(idx, count) {
  if (count <= 1) return 0;
  const spread = Math.min(40, 10 * (count - 1));
  const step = spread / (count - 1);
  return -spread / 2 + idx * step;
}

function renderFanPreview(events) {
  const container = document.getElementById('fan-cards');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthEvents = (events || [])
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  if (monthEvents.length === 0) {
    container.innerHTML = '<div class="fan-empty">이번 달에는 등록된 이벤트가 없어요.</div>';
    return;
  }

  const count = monthEvents.length;
  const mid = (count - 1) / 2;

  container.innerHTML = monthEvents.map((event, idx) => {
    const angle = fanAngle(idx, count);
    const z = Math.round(10 - Math.abs(idx - mid));
    const d = new Date(event.date);
    const days = '일월화수목금토';
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;

    const team = (event.team || '').toUpperCase();
    const hasImg = event.images && event.images.length > 0;

    return `
      <div class="fan-card"
           style="transform: rotate(${angle}deg); z-index: ${z};"
           onclick="openContentWindow('${event._id}')"
           title="${escapeAttr(event.title)}">
        <div class="thumb" data-team="${escapeAttr(team)}">
          <span class="thumb-text">${escapeAttr(team || '?')}</span>
          ${hasImg ? `<img class="thumb-img" src="${escapeAttr(event.images[0])}" alt="" onerror="this.remove()">` : ''}
          <span class="fc-badge">${escapeAttr(team || '?')}</span>
        </div>
        <div class="body">
          <p class="name">${escapeAttr(event.title)}</p>
          <p class="date">${dateStr}</p>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================================================================
   4) 카드 그리드 렌더 / 페이지네이션
   ========================================================================= */

function displayCurrentPage(currentUser) {
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = allEvents.slice(startIndex, endIndex);

  const eventsList = document.getElementById('events-list');
  if (!eventsList) {
    console.warn("Element with id 'events-list' not found.");
    return;
  }


  if (allEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="state">
        <div class="state-icon">🗓️</div>
        <p class="state-title">진행중인 이벤트가 없어요</p>
        <p class="state-desc">새로운 이벤트가 등록되면 이곳에서 확인할 수 있어요.</p>
      </div>
    `;
    updatePaginationControls();
    return;
  }

  eventsList.innerHTML = '<div class="card-grid"></div>';
  const grid = eventsList.querySelector('.card-grid');

  currentEvents.forEach(event => {
    const hasApplied = event.appliedParticipants.some(p => p.userId.toString() === currentUser.id);
    const approvedCount = event.appliedParticipants.filter(p => p.status === 'approved').length;
    const isFull = approvedCount >= event.participants;
    const isActive = currentUser.active;
    const userStatus = hasApplied
      ? event.appliedParticipants.find(p => p.userId.toString() === currentUser.id)?.status
      : null;

    // 상태 배지
    let statusBadge = '';
    if (isFull) {
      statusBadge = '<span class="badge badge-floating badge-danger">마감</span>';
    } else if (hasApplied) {
      statusBadge = userStatus === 'approved'
        ? '<span class="badge badge-floating badge-success">참가확정</span>'
        : '<span class="badge badge-floating badge-warning">승인대기</span>';
    }

    // 신청 버튼
    let applyButton = '';
    if (hasApplied) {
      applyButton = `<button class="btn btn-ghost btn-sm" onclick="cancelApplication('${event._id}')">신청취소</button>`;
    } else if (!isActive) {
      applyButton = '<button class="btn btn-primary btn-sm" disabled>신청불가</button>';
    } else if (event.isSelective && event.additionalQuestions?.length > 0) {
      applyButton = `<button class="btn btn-secondary btn-sm" onclick="openContentWindow('${event._id}')">지원서 작성</button>`;
    } else {
      const buttonText = isFull ? '대기자 신청' : '신청하기';
      applyButton = `<button class="btn btn-primary btn-sm" onclick="applyForEvent('${event._id}')">${buttonText}</button>`;
    }

    // 삭제 버튼 (admin/officer)
    const canDelete = currentUser.role === 'admin'
      || (currentUser.role === 'officer' && event.creator === currentUser.id);
    const deleteBtn = canDelete
      ? `<button class="btn btn-danger btn-sm" onclick="handleCancelEvent('${event._id}', '${event.creator}')">삭제</button>`
      : '';

    const imgSrc = (event.images && event.images.length > 0)
      ? event.images[0]
      : '/images/Basic_Event_Image.png';

    const chips = [
      `<span class="badge badge-team" data-team="${escapeAttr(event.team)}">${escapeAttr(event.team)}</span>`,
      event.isSelective         ? '<span class="badge badge-warning">지원서 필요</span>' : '',
      event.hasParticipantRules ? '<span class="badge badge-warning">참가자 규칙 적용</span>' : '',
    ].filter(Boolean).join('');

    // 태그 (#형식, 메타 정보 아래)
    const tagsHtml = (event.tags || [])
      .map(t => `<span class="card-tag">#${escapeAttr(t)}</span>`).join('');
    const tagsBlock = tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : '';

    // 이벤트별 신청 기간 상태 (applicationStartAt 있는 이벤트만 오버레이)
    const periodStatus = getEventPeriodStatus(event);

    const card = document.createElement('article');
    card.className = `card is-interactive ${periodStatus.cardClass}`;
    card.innerHTML = `
      <div class="card-media">
        ${statusBadge}
        <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(event.title)}"
             onerror="this.src='/images/Basic_Event_Image.png'">
        ${periodStatus.overlayHtml}
      </div>
      <div class="card-body">
        <div class="card-head">
          <h3 class="card-title">${escapeAttr(event.title)}</h3>
          <div class="card-chips">${chips}</div>
        </div>
        <div class="card-meta">
          <div class="meta-item">${ICONS.cal}<span>${formatEventDate(event.date)}</span></div>
          <div class="meta-item">${ICONS.clock}<span>${escapeAttr(event.startTime)} ~ ${escapeAttr(event.endTime)}</span></div>
          <div class="meta-item full">${ICONS.pin}<span>${escapeAttr(event.place)}</span></div>
          <div class="meta-item">${ICONS.users}<span>${approvedCount}/${event.participants}명</span></div>
          <div class="meta-item">${ICONS.won}<span>${formatFee(event)}</span></div>
        </div>
        ${tagsBlock}
        ${periodStatus.bodyCountdownHtml}
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openContentWindow('${event._id}')">상세보기</button>
          ${applyButton}
          ${deleteBtn}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  updatePaginationControls();
  // 카운트다운 ticker 시작 (.period-countdown 요소가 있을 때만 1초마다 갱신)
  startCountdownTicker();
}

// 이벤트별 신청 기간 상태 계산
// applicationStartAt이 없는 이벤트는 normal (오버레이 없음)
function getEventPeriodStatus(event) {
  const empty = { cardClass: '', overlayHtml: '', bodyCountdownHtml: '' };
  if (!event || !event.applicationStartAt) return empty;

  const now = Date.now();
  const startTs = new Date(event.applicationStartAt).getTime();
  if (isNaN(startTs)) return empty;

  // 1) 신청 시작 전 → HH:MM:SS 카운트다운 오버레이 (카드 흐림)
  if (now < startTs) {
    return {
      cardClass: 'is-app-closed',
      overlayHtml: `
        <div class="card-period-overlay">
          <div class="overlay-icon">🔒</div>
          <div class="overlay-text">
            신청까지
            <span class="period-countdown" data-deadline="${startTs}" data-type="start">${formatHMS(startTs - now)}</span>
          </div>
        </div>`,
      bodyCountdownHtml: ''
    };
  }

  // 2) 신청 시작 후, 참가자 확정 마감 전 → 카드 본문(태그 아래)에 작은 카운트다운 pill
  const confTs = event.confirmationDeadlineAt ? new Date(event.confirmationDeadlineAt).getTime() : null;
  if (confTs && !isNaN(confTs) && now < confTs) {
    return {
      cardClass: '',  // 블러/딤 없음
      overlayHtml: '',
      bodyCountdownHtml: `
        <div class="card-period-countdown">
          <span class="cpc-icon">⏰</span>
          <span class="cpc-label">신청자 확정까지</span>
          <span class="period-countdown cpc-time" data-deadline="${confTs}" data-type="conf">${formatHMS(confTs - now)}</span>
        </div>`
    };
  }

  // 3) 모든 마감 지남 → normal
  return empty;
}

// D-N HH:MM 포맷 (e.g. 48시간 → D-2 00:00, 5시간 30분 → D-0 05:30)
function formatHMS(diffMs) {
  if (diffMs <= 0) return 'D-0 00:00';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const remainingSec = totalSec % 86400;
  const hours = Math.floor(remainingSec / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `D-${days} ${pad(hours)}:${pad(minutes)}`;
}

// 1초마다 카운트다운 갱신
let _countdownInterval = null;
function startCountdownTicker() {
  if (_countdownInterval) clearInterval(_countdownInterval);

  const tick = () => {
    const elements = document.querySelectorAll('.period-countdown');
    if (elements.length === 0) {
      if (_countdownInterval) {
        clearInterval(_countdownInterval);
        _countdownInterval = null;
      }
      return;
    }

    const now = Date.now();
    let needsRefresh = false;
    elements.forEach(el => {
      const deadlineMs = parseInt(el.dataset.deadline, 10);
      if (isNaN(deadlineMs)) return;
      const remaining = deadlineMs - now;
      if (remaining <= 0) {
        el.textContent = 'D-0 00:00';
        needsRefresh = true;
      } else {
        el.textContent = formatHMS(remaining);
      }
    });

    if (needsRefresh) {
      clearInterval(_countdownInterval);
      _countdownInterval = null;
      // 상태 전환을 위해 잠시 뒤 재조회
      setTimeout(() => { if (typeof fetchEvents === 'function') fetchEvents(); }, 800);
    }
  };

  tick();
  _countdownInterval = setInterval(tick, 1000);
}

function updatePaginationControls() {
  const totalPages = Math.ceil(allEvents.length / eventsPerPage);
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  if (prevButton) prevButton.disabled = currentPage === 1;
  if (nextButton) nextButton.disabled = currentPage === totalPages || totalPages === 0;
  if (pageInfo)   pageInfo.textContent = `페이지 ${currentPage} / ${Math.max(totalPages, 1)}`;
}

/* =========================================================================
   5) 액션 (상세 이동 / 신청 / 취소 / 삭제)
   ========================================================================= */

async function openContentWindow(eventId) {
  try {
    window.location.href = `additional-info.html?id=${eventId}`;
  } catch (error) {
    console.error('Error opening event content window:', error);
  }
}

async function applyForEvent(eventId) {
  // 약관 동의 모달 — 동의해야 신청 진행
  const agreed = typeof window.confirmEventApplication === 'function'
    ? await window.confirmEventApplication()
    : confirm('참가 확정 후에는 참가비 환불이 불가능하며, 취소 시 경고가 부여될 수 있습니다. 동의하시겠습니까?');
  if (!agreed) return;

  try {
    const response = await fetch(`/events/${eventId}/apply`, { method: 'POST' });
    if (response.ok) {
      alert('신청이 완료되었습니다. 운영진의 승인을 기다려주세요.');
      fetchEvents();
    } else {
      const error = await response.json();
      alert(`신청 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('Error applying for event:', error);
    alert('신청 중 문제가 발생했습니다.');
  }
}

async function cancelApplication(eventId) {
  const isConfirmed = confirm('정말로 신청을 취소하시겠습니까?\n\n참가 확정 후 취소 시:\n• 참가비 환불이 불가능합니다.\n• 경고가 부여될 수 있습니다.');
  if (!isConfirmed) return;

  try {
    const response = await fetch(`/events/${eventId}/cancel-application`, { method: 'POST' });
    const result = await response.json();
    alert(result.message);
    fetchEvents();
  } catch (error) {
    console.error('Error canceling application:', error);
    alert('신청 취소 중 문제가 발생했습니다.');
  }
}

async function cancelEvent(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      alert('이벤트가 성공적으로 삭제되었습니다.');
      fetchEvents();
    } else {
      const errorData = await response.json();
      console.error('Failed to delete event:', errorData.message);
      alert('이벤트 삭제에 실패했습니다: ' + errorData.message);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('이벤트 삭제 중 오류가 발생했습니다.');
  }
}

async function handleCancelEvent(eventId, eventCreator) {
  try {
    const userResponse = await fetch('/user/info');
    const currentUser = await userResponse.json();

    if (currentUser.role === 'admin' || (currentUser.role === 'officer' && eventCreator === currentUser.id)) {
      const isConfirmed = confirm('이벤트를 삭제하시겠습니까?');
      if (isConfirmed) {
        await cancelEvent(eventId);
      }
    } else {
      alert('이벤트를 삭제할 권한이 없습니다.');
    }
  } catch (error) {
    console.error('Error checking role or canceling event:', error);
    alert('이벤트 삭제 중 오류가 발생했습니다.');
  }
}

/* =========================================================================
   6) DOM Ready
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // 페이지네이션 버튼
  const prev = document.getElementById('prev-page');
  const next = document.getElementById('next-page');
  if (prev) {
    prev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        fetchEvents();
      }
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      const totalPages = Math.ceil(allEvents.length / eventsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        fetchEvents();
      }
    });
  }

  // 최초 로드
  fetchEvents();
});

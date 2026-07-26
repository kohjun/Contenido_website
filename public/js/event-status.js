// public/js/event-status.js
// 신청자 관리 페이지 — 통계 + 정렬 + 카드 리스트 + 지원서 모달

const eventAccessMap = new Map();
let _currentEvent = null;
let _currentParticipants = [];
let _currentSort = 'appliedAt-desc';
let _currentFilter = 'all';  // 'all' | 'approved' | 'pending' | 'rejected' | 'cancelled'

/* ---------------- 포맷 헬퍼 ---------------- */

function formatRole(role) {
  switch (role) {
    case 'starter': return '스타터';
    case 'officer': return '운영진';
    case 'participant': return '참가자';
    case 'admin': return '관리자';
    case 'guest': return '게스트';
    case 'applicant': return '지원자';
    default: return role || '게스트';
  }
}

function formatTeam(team) {
  switch (team) {
    case 'operationTeam': return '운영팀';
    case 'HumanResourceTeam': return '인사팀';
    case 'financeTeam': return '재무팀';
    case 'cooperationTeam': return '대외협력팀';
    case 'marketingTeam': return '홍보팀';
    case 'designTeam': return '디자인팀';
    case 'videoTeam': return '영상제작팀';
    case 'PlanningTeam': return '기획팀';
    case 'regularTeam': return '정기모임팀';
    case 'staffTeam': return '스태프팀';
    case 'projectTeam': return '프로젝트팀';
    default: return team || '-';
  }
}

function formatBirthYear(birthDate) {
  if (!birthDate) return '';
  const year = new Date(birthDate).getFullYear();
  return `${year.toString().slice(2)}년생`;
}

function formatGender(gender) {
  return gender === 'male' ? '남' : gender === 'female' ? '여' : '기타';
}

function formatAppliedAt(d) {
  return new Date(d).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDDay(target) {
  if (!target) return null;
  const t = new Date(target);
  if (isNaN(t.getTime())) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((targetMidnight - todayMidnight) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff}`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber === '-') return '-';
  const numbers = phoneNumber.replace(/[^0-9]/g, '');
  if (numbers.length === 11) return `${numbers.slice(0,3)}-****-${numbers.slice(7)}`;
  if (numbers.length === 10) return `${numbers.slice(0,3)}-***-${numbers.slice(6)}`;
  return phoneNumber;
}

/* ---------------- 데이터 fetch ---------------- */

async function fetchEventStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  if (!eventId) {
    alert('이벤트 ID가 없습니다.');
    return;
  }

  // 첫 접근 시 접근 코드 확인 (admin 또는 이벤트 생성자 creator는 코드 생략)
  if (!eventAccessMap.has(eventId)) {
    let isBypassedUser = false;
    try {
      const [me, ev] = await Promise.all([
        fetch('/user/info', { credentials: 'include' }).then(r => (r.ok ? r.json() : null)),
        fetch(`/events/${eventId}`).then(r => (r.ok ? r.json() : null))
      ]);
      const myId = me?._id || me?.id;
      const creatorId = ev?.creator?._id || ev?.creator;
      isBypassedUser = !!(me && (me.role === 'admin' || (myId && creatorId && myId.toString() === creatorId.toString())));
    } catch (_) {}
    if (!isBypassedUser) {
      const hasAccess = await verifyEventAccess(eventId);
      if (!hasAccess) {
        window.location.href = 'events.html';
        return;
      }
    }
    eventAccessMap.set(eventId, true);
  }

  try {
    const [eventRes, partResp] = await Promise.all([
      fetch(`/events/${eventId}`).then(r => r.json()),
      fetch(`/events/${eventId}/participants`)
    ]);

    _currentEvent = eventRes;
    renderEventSummary(_currentEvent);

    // 신청자 조회 실패(403 권한없음 / 401 미로그인 등)를 '신청자 없음'으로 오인하지 않도록 명확히 처리
    if (!partResp.ok) {
      const err = await partResp.json().catch(() => ({}));
      _currentParticipants = [];
      const reason = partResp.status === 403 ? '이 이벤트의 신청자를 볼 권한이 없습니다. (운영진/관리자 계정으로 로그인했는지 확인하세요)'
                   : partResp.status === 401 ? '로그인이 필요합니다. 다시 로그인해 주세요.'
                   : (err.message || '신청자 목록을 불러오지 못했습니다.');
      const list = document.getElementById('participant-list');
      if (list) list.innerHTML = `<div class="empty">⚠️ ${escapeHtml(reason)} (HTTP ${partResp.status})</div>`;
      console.warn('[event-status] 신청자 조회 실패:', partResp.status, err.message || '');
      return;
    }

    const participantsRes = await partResp.json();
    _currentParticipants = (participantsRes && participantsRes.participants) || [];

    renderStatsGrid(_currentEvent, _currentParticipants);
    renderDistributions(_currentParticipants);
    renderFilterCounts(_currentParticipants);
    renderParticipantList();
  } catch (error) {
    console.error('Error fetching event status:', error);
    alert('참가 현황을 가져오는 중 오류가 발생했습니다.');
  }
}

/* ---------------- 렌더링 ---------------- */

function renderEventSummary(event) {
  const titleEl = document.getElementById('es-title');
  const metaEl  = document.getElementById('es-meta');
  const tagsEl  = document.getElementById('es-tags');
  if (titleEl) titleEl.textContent = event.title || '-';

  if (metaEl) {
    const dateStr = new Date(event.date).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const parts = [
      `<span>날짜: ${escapeHtml(dateStr)}</span>`,
      `<span>시간: ${escapeHtml(event.startTime || '')} ~ ${escapeHtml(event.endTime || '')}</span>`,
      `<span>장소: ${escapeHtml(event.place || '')}</span>`,
    ];
    if (event.isSelective) {
      parts.push('<span class="selective-tag">선발 이벤트</span>');
    }
    metaEl.innerHTML = parts.join('');
  }

  if (tagsEl) {
    const tags = Array.isArray(event.tags) ? event.tags : [];
    tagsEl.innerHTML = tags.length
      ? tags.map(t => `<span class="es-tag">#${escapeHtml(t)}</span>`).join('')
      : '';
  }
}

function renderStatsGrid(event, participants) {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  // 취소된 신청자는 "현재 신청자"에서 제외
  const activeParticipants = participants.filter(p => p.status !== 'cancelled');
  const totalApplied = activeParticipants.length;
  const approved = participants.filter(p => p.status === 'approved').length;
  const pending  = participants.filter(p => !p.status || p.status === 'pending').length;
  const rejected = participants.filter(p => p.status === 'rejected').length;
  const cancelled = participants.filter(p => p.status === 'cancelled').length;
  const capacity = event.participants || 0;
  const maxApp   = event.maxApplicants || null;

  const appDDay = formatDDay(event.applicationDeadlineAt);
  const confDDay = formatDDay(event.confirmationDeadlineAt);

  const cards = [
    {
      class: 'is-primary',
      label: '총 신청자',
      value: `${totalApplied}`,
      sub: maxApp ? `/ 최대 ${maxApp}명` : `명`
    },
    {
      class: 'is-success',
      label: '참가 확정',
      value: `${approved}`,
      sub: `/ 정원 ${capacity}명`
    },
    {
      class: 'is-warning',
      label: '대기 중',
      value: `${pending}`,
      sub: '명'
    },
    {
      class: '',
      label: '거절',
      value: `${rejected}`,
      sub: '명'
    },
    {
      class: '',
      label: '취소',
      value: `${cancelled}`,
      sub: '명'
    },
  ];

  if (appDDay) {
    cards.push({
      class: '',
      label: '신청 마감',
      value: appDDay,
      sub: new Date(event.applicationDeadlineAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    });
  }
  if (confDDay) {
    cards.push({
      class: '',
      label: '확정 마감',
      value: confDDay,
      sub: new Date(event.confirmationDeadlineAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    });
  }

  grid.innerHTML = cards.map(c => `
    <div class="stat-card ${c.class}">
      <div class="stat-label">${escapeHtml(c.label)}</div>
      <div class="stat-value">${escapeHtml(c.value)} <span class="stat-sub">${escapeHtml(c.sub)}</span></div>
    </div>
  `).join('');
}

/* ---------------- 분포 차트 ---------------- */

function calcAge(birthDate) {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  if (isNaN(bd.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear() + 1;
  return age;
}

function renderDistributions(participants) {
  // 취소자는 분포 계산에서 제외 (활성 신청자만)
  const active = participants.filter(p => p.status !== 'cancelled');
  renderGenderDist(active);
  renderAgeDist(active);
  renderRegionDist(active);
}

function renderGenderDist(participants) {
  const body = document.querySelector('#dist-gender .dist-card-body');
  if (!body) return;
  const total = participants.length;
  if (total === 0) {
    body.innerHTML = '<div class="dist-empty">데이터 없음</div>';
    return;
  }
  const male   = participants.filter(p => p.gender === 'male').length;
  const female = participants.filter(p => p.gender === 'female').length;
  const other  = total - male - female;
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  // 평균 나이
  const ages = participants.map(p => calcAge(p.birthDate)).filter(a => a != null);
  const avgAge = ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : '-';

  body.innerHTML = `
    <div class="ratio-bar">
      ${male   ? `<div class="ratio-male"   style="width:${pct(male)}%"></div>`   : ''}
      ${female ? `<div class="ratio-female" style="width:${pct(female)}%"></div>` : ''}
      ${other  ? `<div class="ratio-other"  style="width:${pct(other)}%"></div>`  : ''}
    </div>
    <div class="ratio-legend">
      <span class="legend-item"><span class="dot dot-male"></span>남 <b>${male}</b> (${pct(male)}%)</span>
      <span class="legend-item"><span class="dot dot-female"></span>여 <b>${female}</b> (${pct(female)}%)</span>
      ${other ? `<span class="legend-item"><span class="dot dot-other"></span>기타 <b>${other}</b> (${pct(other)}%)</span>` : ''}
    </div>
    <div class="ratio-summary">평균 나이 <b>${avgAge}</b>세 · 총 ${total}명</div>
  `;
}

function renderAgeDist(participants) {
  const body = document.querySelector('#dist-age .dist-card-body');
  if (!body) return;
  if (participants.length === 0) {
    body.innerHTML = '<div class="dist-empty">데이터 없음</div>';
    return;
  }

  // 연령대 그룹
  const groups = [
    { label: '20–23세',  min: 20,  max: 23 },
    { label: '24–26세',  min: 24,  max: 26 },
    { label: '27–29세',  min: 27,  max: 29 },
    { label: '30대',     min: 30,  max: 39 },
  ];

  const counts = groups.map(g => {
    return participants.filter(p => {
      const a = calcAge(p.birthDate);
      return a != null && a >= g.min && a <= g.max;
    }).length;
  });
  const max = Math.max(1, ...counts);

  body.innerHTML = `
    <div class="dist-chart">
      ${groups.map((g, i) => `
        <div class="dist-row">
          <span class="dist-label">${g.label}</span>
          <div class="dist-bar"><div class="dist-fill" style="width:${(counts[i] / max) * 100}%"></div></div>
          <span class="dist-count">${counts[i]}명</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRegionDist(participants) {
  const body = document.querySelector('#dist-region .dist-card-body');
  if (!body) return;
  if (participants.length === 0) {
    body.innerHTML = '<div class="dist-empty">데이터 없음</div>';
    return;
  }

  const counter = new Map();
  participants.forEach(p => {
    const region = (p.preferredActivity || '').trim();
    if (!region) return;
    counter.set(region, (counter.get(region) || 0) + 1);
  });

  if (counter.size === 0) {
    body.innerHTML = '<div class="dist-empty">선호 지역 정보 없음</div>';
    return;
  }

  // 카운트 내림차순 정렬, 상위 7개 + 그 외
  const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const restSum = rest.reduce((s, [, n]) => s + n, 0);
  if (restSum > 0) top.push(['기타', restSum]);

  const max = Math.max(1, ...top.map(([, n]) => n));

  body.innerHTML = `
    <div class="dist-chart">
      ${top.map(([region, n]) => `
        <div class="dist-row">
          <span class="dist-label">${escapeHtml(region)}</span>
          <div class="dist-bar"><div class="dist-fill" style="width:${(n / max) * 100}%"></div></div>
          <span class="dist-count">${n}명</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ---------------- 필터 ---------------- */

function renderFilterCounts(participants) {
  const counts = {
    all:       participants.length,
    approved:  participants.filter(p => p.status === 'approved').length,
    pending:   participants.filter(p => !p.status || p.status === 'pending').length,
    rejected:  participants.filter(p => p.status === 'rejected').length,
    cancelled: participants.filter(p => p.status === 'cancelled').length,
  };
  Object.entries(counts).forEach(([key, n]) => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = n;
  });
}

function setFilter(status) {
  _currentFilter = status;
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('is-active', tab.dataset.status === status);
  });
  renderParticipantList();
}

function sortParticipants(arr, mode) {
  const sorted = [...arr];
  const statusRank = { approved: 0, pending: 1, rejected: 2, cancelled: 3 };

  switch (mode) {
    case 'appliedAt-asc':
      sorted.sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt));
      break;
    case 'appliedAt-desc':
      sorted.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
      break;
    case 'name':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      break;
    case 'status':
      sorted.sort((a, b) => {
        const aR = statusRank[a.status || 'pending'] ?? 99;
        const bR = statusRank[b.status || 'pending'] ?? 99;
        return aR - bR;
      });
      break;
    case 'age-young':
      sorted.sort((a, b) => new Date(b.birthDate || 0) - new Date(a.birthDate || 0));
      break;
    case 'age-old':
      sorted.sort((a, b) => new Date(a.birthDate || 0) - new Date(b.birthDate || 0));
      break;
    case 'count-desc':
      sorted.sort((a, b) => (b.regularCount || 0) - (a.regularCount || 0));
      break;
    case 'count-asc':
      sorted.sort((a, b) => (a.regularCount || 0) - (b.regularCount || 0));
      break;
  }
  return sorted;
}

function renderParticipantList() {
  const list = document.getElementById('participant-list');
  if (!list || !_currentEvent) return;

  if (_currentParticipants.length === 0) {
    list.innerHTML = '<div class="empty">아직 신청한 사람이 없어요.</div>';
    return;
  }

  // 필터 적용
  const filtered = _currentFilter === 'all'
    ? _currentParticipants
    : _currentParticipants.filter(p => (p.status || 'pending') === _currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty">해당 상태의 신청자가 없어요.</div>`;
    return;
  }

  // 초대장(Approach 2)으로 신청한 지인은 해당 부원의 카드 내부에 묶어서 표시 (단독 카드 미노출)
  const mainParticipants = filtered.filter(p => !p.isGuest);

  if (mainParticipants.length === 0) {
    list.innerHTML = `<div class="empty">해당 상태의 신청자가 없어요.</div>`;
    return;
  }

  const sorted = sortParticipants(mainParticipants, _currentSort);
  const approvedCount = _currentParticipants.filter(p => p.status === 'approved').length;
  const canApprove = approvedCount < (_currentEvent.participants || 0);
  const event = _currentEvent;

  list.innerHTML = sorted.map(p => {
    const status = p.status || 'pending';
    const statusClass = `is-${status}`;
    
    let statusPill = '';
    let buttonsHtml = '';

    if (event.isLightning && status === 'approved') {
      const verifyStatus = (p.verification && p.verification.status) ? p.verification.status : 'none';
      const cancelBtn = p.cancellationRequested
        ? `<button onclick="processCancellation('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reject-btn">취소 처리</button>`
        : '';

      if (verifyStatus === 'approved') {
        statusPill = `<span class="status-pill approved" style="background-color: #a7f3d0; color: #065f46;">✓ 2차 승인 완료</span>`;
        buttonsHtml = `
          ${cancelBtn}
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else if (verifyStatus === 'rejected') {
        statusPill = `<span class="status-pill rejected" style="background-color: #fca5a5; color: #b91c1c;">✕ 경고 부여 완료</span>`;
        buttonsHtml = `
          ${cancelBtn}
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else if (verifyStatus === 'pending') {
        statusPill = `<span class="status-pill pending" style="background-color: #bae6fd; color: #0369a1;">⏳ 인증 대기 중</span>`;
        buttonsHtml = `
          ${cancelBtn}
          <button onclick="approveLightning('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="approve-btn" style="background-color: #10b981; color: white;">2차 승인</button>
          <button onclick="warnLightning('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reject-btn" style="background-color: #ef4444; color: white;">경고 부여</button>
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else {
        // verifyStatus === 'none'
        statusPill = `<span class="status-pill" style="background-color: #e2e8f0; color: #475569;">❔ 인증 미제출</span>`;
        buttonsHtml = `
          ${cancelBtn}
          <button onclick="approveLightning('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="approve-btn" style="background-color: #10b981; color: white;">2차 승인</button>
          <button onclick="warnLightning('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reject-btn" style="background-color: #ef4444; color: white;">경고 부여</button>
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      }
    } else {
      statusPill =
        status === 'approved'  ? `<span class="status-pill approved">✓ 참가확정</span>${p.cancellationRequested ? ' <span class="status-pill cancelled">🚪 취소 요청</span>' : ''}` :
        status === 'rejected'  ? '<span class="status-pill rejected">✕ 거절됨</span>' :
        status === 'cancelled' ? '<span class="status-pill cancelled">↩ 본인 취소</span>' :
                                 '<span class="status-pill pending">⏳ 승인 대기</span>';

      if (status === 'cancelled') {
        buttonsHtml = `
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else if (status === 'approved') {
        const cancelBtn = p.cancellationRequested
          ? `<button onclick="processCancellation('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reject-btn">취소 처리</button>`
          : '';
        buttonsHtml = `
          ${cancelBtn}
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else if (status === 'rejected') {
        buttonsHtml = `
          <button onclick="resetParticipantStatus('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="reset-btn">대기로 되돌리기</button>
          <button onclick="showStatusHistory('${event._id}', '${p.userId}', '${escapeHtml(p.name)}')" class="history-btn">이력</button>
        `;
      } else {
        const approveAttrs = (event.isLightning || canApprove) ? '' : 'disabled title="정원 마감"';
        buttonsHtml = `
          <button onclick="updateParticipantStatus('${event._id}', '${p.userId}', 'approved')" class="approve-btn" ${approveAttrs}>승인</button>
          <button onclick="updateParticipantStatus('${event._id}', '${p.userId}', 'rejected')" class="reject-btn">거절</button>
        `;
      }
    }

    // 지원서가 있으면 펼치기 버튼
    const hasAnswers = Array.isArray(p.answers) && p.answers.length > 0;
    const answersBtn = hasAnswers
      ? `<button onclick="toggleAnswers('${p.userId}')" class="answers-btn" type="button">📝 지원서</button>`
      : '';

    // 번개 인증 자료가 있으면 펼치기 버튼
    const hasLightningVerification = p.verification && (verifyStatus => verifyStatus !== 'none') && p.verification.photo;
    const lightningVerifyBtn = hasLightningVerification
      ? `<button onclick="toggleLightningVerification('${p.userId}')" class="answers-btn" type="button" style="background-color: #0d9488; color: #fff;">인증 보기</button>`
      : '';

    // 답변 섹션 HTML
    let answersHtml = '';
    if (hasAnswers) {
      answersHtml = `
        <div class="pc-answers" id="answers-${p.userId}">
          ${p.answers.map((a, idx) => {
            const q = event.additionalQuestions && event.additionalQuestions[idx]
              ? event.additionalQuestions[idx].questionText
              : '질문이 없습니다';
            return `
              <div class="answer-section">
                <p class="question-text">Q${idx + 1}. ${escapeHtml(q)}</p>
                <div class="answer-text">${escapeHtml(a.answerText || '')}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 번개 인증 HTML
    let lightningVerifyHtml = '';
    if (hasLightningVerification) {
      lightningVerifyHtml = `
        <div class="pc-answers" id="lightning-verify-${p.userId}" style="border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 10px;">
          <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: #0f766e;">⚡ 번개 모임 현장 인증 내역</h4>
          ${(p.verification.textAnswers || []).map((a, idx) => `
            <div class="answer-section" style="margin-bottom: 8px;">
              <p class="question-text" style="font-weight: 600; font-size: 0.8rem; margin: 0; color: #334155;">Q${idx + 1}. ${escapeHtml(a.question)}</p>
              <div class="answer-text" style="font-size: 0.85rem; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; margin-top: 2px;">${escapeHtml(a.answer || '')}</div>
            </div>
          `).join('')}
          <div style="margin-top: 10px;">
            <p style="font-weight: 600; font-size: 0.8rem; margin: 0 0 4px 0; color: #334155;">📷 현장 인증 사진</p>
            <a href="${escapeHtml(p.verification.photo)}" target="_blank" style="display: inline-block;">
              <img src="${escapeHtml(p.verification.photo)}" style="max-width: 150px; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; transition: transform 0.2s;" alt="인증사진" onerror="this.remove()">
            </a>
          </div>
        </div>
      `;
    }

    const hasCompanions = Array.isArray(p.companions) && p.companions.length > 0;
    const companionHtml = hasCompanions
      ? `
        <div style="margin-top: 8px; padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 0.82rem; color: #166534;">
          <strong style="display: flex; align-items: center; gap: 4px; color: #15803d; margin-bottom: 4px;">👥 동반 지인 (${p.companions.length}명)</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${p.companions.map(c => {
              const gStr = c.gender === 'female' ? '여' : (c.gender === 'male' ? '남' : '');
              const ageStr = c.age ? `${c.age}세` : '';
              const metaInfo = [gStr, ageStr, c.phone].filter(Boolean).join(' · ');
              return `
                <span style="background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: 500; color: #334155;">
                  ${escapeHtml(c.name)} <small style="color: #64748b;">(${escapeHtml(metaInfo)})</small>
                </span>
              `;
            }).join('')}
          </div>
        </div>
      `
      : '';

    // 초대장(Approach 2)으로 신청된 지인 목록을 부원 카드 하단에 그룹으로 묶어 표시
    const linkedGuests = _currentParticipants.filter(
      g => g.isGuest && String(g.inviterUserId) === String(p.userId)
    );

    const guestSectionHtml = linkedGuests.length > 0
      ? `
        <div style="margin-top: 10px; padding: 10px 12px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 12px; font-size: 0.82rem;">
          <strong style="display: flex; align-items: center; justify-content: space-between; color: #0369a1; margin-bottom: 8px;">
            <span>👥 초대장 동반 신청 지인 (${linkedGuests.length}명)</span>
          </strong>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${linkedGuests.map(g => {
              const gName = g.guestInfo?.name || g.name || '지인';
              const gPhone = g.guestInfo?.phone || g.phonenumber || '-';
              const gGenderStr = g.gender === 'female' ? '여' : (g.gender === 'male' ? '남' : '');
              const gAgeStr = g.age ? `${g.age}세` : '';
              const gMeta = [gGenderStr, gAgeStr, gPhone].filter(Boolean).join(' · ');
              
              const stBadge = g.status === 'approved'
                ? '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: bold;">✓ 승인됨</span>'
                : (g.status === 'rejected'
                  ? '<span style="background: #fef2f2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem;">✕ 거절됨</span>'
                  : (g.status === 'cancelled'
                    ? '<span style="background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem;">↩ 본인취소</span>'
                    : '<span style="background: #fef9c3; color: #a16207; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem;">⏳ 대기중</span>'));

              const gId = g._id || g.id;
              let gButtonsHtml = '';
              if (g.status === 'pending') {
                if (p.status === 'approved') {
                  gButtonsHtml = `
                    <button onclick="updateGuestStatus('${event._id}', '${gId}', 'approved')" style="background: #10b981; color: #fff; border: none; border-radius: 6px; padding: 4px 9px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">지인 승인</button>
                    <button onclick="updateGuestStatus('${event._id}', '${gId}', 'rejected')" style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 4px 9px; font-size: 0.75rem; cursor: pointer;">거절</button>
                  `;
                } else {
                  gButtonsHtml = `
                    <button onclick="alert('초대한 부원(${escapeHtml(p.name)})의 참가가 확정(승인)된 후에만 지인을 승인할 수 있습니다.')" style="background: #cbd5e1; color: #64748b; border: none; border-radius: 6px; padding: 4px 9px; font-size: 0.75rem; cursor: not-allowed;" title="부원 승인 후 가능">지인 승인 (부원 승인 필요)</button>
                    <button onclick="updateGuestStatus('${event._id}', '${gId}', 'rejected')" style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 4px 9px; font-size: 0.75rem; cursor: pointer;">거절</button>
                  `;
                }
              } else if (g.status === 'approved' || g.status === 'rejected') {
                gButtonsHtml = `
                  <button onclick="resetGuestStatus('${event._id}', '${gId}', '${escapeHtml(gName)}')" style="background: #64748b; color: #fff; border: none; border-radius: 6px; padding: 3px 8px; font-size: 0.72rem; cursor: pointer;">대기로 되돌리기</button>
                `;
              }

              return `
                <div style="background: #ffffff; border: 1px solid #bae6fd; padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                  <div>
                    <strong style="color: #0f172a; font-size: 0.85rem;">${escapeHtml(gName)}</strong>
                    <span style="color: #64748b; font-size: 0.78rem; margin-left: 4px;">(${escapeHtml(gMeta)})</span>
                    <span style="margin-left: 6px;">${stBadge}</span>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    ${gButtonsHtml}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
      : '';

    return `
      <article class="participant-card ${statusClass}" data-user-id="${p.userId}">
        <div class="pc-header">
          <div class="pc-name">
            <span>${escapeHtml(p.name || '-')}</span>
            ${p.birthDate ? `<span class="birth">${escapeHtml(formatBirthYear(p.birthDate))}</span>` : ''}
          </div>
          ${statusPill}
        </div>
        <div class="pc-meta">
          <div class="row">
            <span class="meta-label">역할</span>
            <span>${escapeHtml(formatRole(p.role))} · ${escapeHtml(formatTeam(p.team))} · ${escapeHtml(formatGender(p.gender))}</span>
          </div>
          <div class="row">
            <span class="meta-label">전화</span>
            <span>${escapeHtml(p.phonenumber || '-')}</span>
          </div>
          <div class="row">
            <span class="meta-label">신청</span>
            <span>${escapeHtml(formatAppliedAt(p.appliedAt))}</span>
          </div>
          <div class="row">
            <span class="meta-label">참여</span>
            <span>정기 <b>${p.regularCount || 0}</b>회${p.totalCount ? ` <span class="meta-sub">(총 ${p.totalCount}회)</span>` : ''}</span>
          </div>
        </div>
        ${companionHtml}
        ${guestSectionHtml}
        <div class="pc-actions">
          ${buttonsHtml}
          ${answersBtn}
          ${lightningVerifyBtn}
        </div>
        ${answersHtml}
        ${lightningVerifyHtml}
      </article>
    `;
  }).join('');
}

/* ---------------- 인터랙션 ---------------- */

function toggleAnswers(userId) {
  const el = document.getElementById(`answers-${userId}`);
  if (el) el.classList.toggle('is-open');
}

function toggleLightningVerification(userId) {
  const el = document.getElementById(`lightning-verify-${userId}`);
  if (el) el.classList.toggle('is-open');
}

async function approveLightning(eventId, userId, name) {
  if (!confirm(`정말로 ${name} 부원의 번개 모임 2차 승인을 완료하시겠습니까?\n이 승인은 철회할 수 없으며 경고 면제 처리가 됩니다.`)) return;

  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/lightning-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      alert(`${name} 부원의 2차 승인이 완료되었습니다.`);
      fetchEventStatus();
    } else {
      const err = await response.json();
      alert(`2차 승인 실패: ${err.message}`);
    }
  } catch (error) {
    console.error('Error in approveLightning:', error);
    alert('승인 처리 중 오류가 발생했습니다.');
  }
}

async function warnLightning(eventId, userId, name) {
  const reason = prompt(`정말로 ${name} 부원에게 경고를 부여하시겠습니까?\n경고 사유를 입력하세요 (기본값: 번개주최 미인증):`, '번개주최 미인증');
  if (reason === null) return; // 취소 클릭 시 중단

  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/lightning-warn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() || '번개주최 미인증' })
    });

    if (response.ok) {
      alert(`${name} 부원에게 경고가 성공적으로 부여되었습니다.`);
      fetchEventStatus();
    } else {
      const err = await response.json();
      alert(`경고 부여 실패: ${err.message}`);
    }
  } catch (error) {
    console.error('Error in warnLightning:', error);
    alert('경고 부여 중 오류가 발생했습니다.');
  }
}

async function verifyEventAccess(eventId) {
  const accessCode = prompt('이벤트 접근 코드를 입력하세요 (4자리):');
  if (!accessCode) return false;

  try {
    const response = await fetch(`/events/${eventId}/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode })
    });
    if (!response.ok) {
      const error = await response.json();
      alert(error.message || '접근 코드 확인 실패');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying access:', error);
    alert('접근 코드 확인 중 오류가 발생했습니다.');
    return false;
  }
}

async function updateParticipantStatus(eventId, userId, status) {
  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) return await updateParticipantStatus(eventId, userId, status);
        window.location.href = 'event-staff.html';
        return;
      }
      throw new Error(error.message);
    }
    alert(status === 'approved' ? '참가자가 승인되었습니다.' : '참가 신청이 거절되었습니다.');
    await fetchEventStatus();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || '상태 업데이트 중 오류가 발생했습니다.');
  }
}

async function updateGuestStatus(eventId, guestId, status) {
  try {
    const response = await fetch(`/events/${eventId}/guests/${guestId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) return await updateGuestStatus(eventId, guestId, status);
        window.location.href = 'event-staff.html';
        return;
      }
      throw new Error(error.message);
    }
    alert(status === 'approved' ? '동반 지인이 승인되었습니다.' : '동반 지인 신청이 거절되었습니다.');
    await fetchEventStatus();
  } catch (error) {
    console.error('Error updating guest status:', error);
    alert(error.message || '지인 상태 업데이트 중 오류가 발생했습니다.');
  }
}

async function resetGuestStatus(eventId, guestId, guestName) {
  const confirmMessage = `${guestName} 지인의 참가 상태를 대기 상태로 되돌리시겠습니까?`;
  if (!confirm(confirmMessage)) return;

  try {
    const response = await fetch(`/events/${eventId}/guests/${guestId}/reset-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) return await resetGuestStatus(eventId, guestId, guestName);
        window.location.href = 'event-staff.html';
        return;
      }
      throw new Error(error.message);
    }
    alert(`${guestName} 지인의 상태가 대기 상태로 되돌려졌습니다.`);
    await fetchEventStatus();
  } catch (error) {
    console.error('Error resetting guest status:', error);
    alert(error.message || '지인 상태 되돌리기 중 오류가 발생했습니다.');
  }
}

async function resetParticipantStatus(eventId, userId, participantName) {
  const confirmMessage = `${participantName}님의 참가 상태를 대기 상태로 되돌리시겠습니까?\n\n되돌린 후에는 해당 기록이 남게 됩니다.`;
  if (!confirm(confirmMessage)) return;

  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/reset-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) return await resetParticipantStatus(eventId, userId, participantName);
        window.location.href = 'event-staff.html';
        return;
      }
      throw new Error(error.message);
    }
    const result = await response.json();
    alert(`${participantName}님의 상태가 대기 상태로 되돌려졌습니다.\n처리자: ${result.resetBy}`);
    await fetchEventStatus();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || '상태 되돌리기 중 오류가 발생했습니다.');
  }
}

// 담당 운영진: 참가확정자의 취소 요청을 처리 (→ cancelled)
async function processCancellation(eventId, userId, participantName) {
  if (!confirm(`${participantName}님의 참가 취소 요청을 처리하시겠습니까?\n참가가 '취소' 상태로 변경됩니다.`)) return;
  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/process-cancellation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) return await processCancellation(eventId, userId, participantName);
        window.location.href = 'event-staff.html';
        return;
      }
      throw new Error(error.message || '취소 처리에 실패했습니다.');
    }
    const result = await response.json();
    alert(`${participantName}님의 참가가 취소 처리되었습니다.\n처리자: ${result.processedBy}`);
    await fetchEventStatus();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || '취소 처리 중 오류가 발생했습니다.');
  }
}

async function showStatusHistory(eventId, userId, participantName) {
  try {
    const response = await fetch(`/events/${eventId}/participants/${userId}/status-history`);
    if (!response.ok) throw new Error('상태 이력을 가져올 수 없습니다.');
    const data = await response.json();
    const current = data.statusHistory || [];
    const past = data.previousAttempts || [];

    if (current.length === 0 && past.length === 0) {
      alert(`${participantName}님의 상태 변경 이력이 없습니다.`);
      return;
    }

    const fmtEntries = (entries) => entries
      .slice()
      .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)) // 오래된 → 최근
      .map((r, i) => {
        const date = new Date(r.changedAt).toLocaleString('ko-KR');
        const action = r.isReset ? '되돌림' : '변경';
        return `   ${i + 1}. ${date}\n      ${r.previousStatus} → ${r.newStatus} (${action}) / 처리자: ${r.changerName}`;
      })
      .join('\n');

    let txt = `${participantName}님의 신청 이력\n`;

    // 이전 신청(취소 후 재신청) — 시도별로 분리 표시
    past.forEach((att, idx) => {
      const applied = att.appliedAt ? new Date(att.appliedAt).toLocaleString('ko-KR') : '-';
      const finalLabel = att.finalStatus === 'cancelled' ? '본인 취소'
                       : att.finalStatus === 'rejected' ? '거절됨'
                       : (att.finalStatus || '종료');
      txt += `\n━━ 이전 신청 ${idx + 1}차 (${finalLabel}) ━━\n   신청: ${applied}\n`;
      txt += (att.statusHistory && att.statusHistory.length) ? fmtEntries(att.statusHistory) + '\n' : '   (상태 변경 없음)\n';
    });

    // 현재(활성) 신청
    txt += `\n━━ 현재 신청${past.length ? ` (${past.length + 1}차)` : ''} ━━\n`;
    txt += current.length ? fmtEntries(current) + '\n' : '   (상태 변경 없음 — 신청 후 대기 중)\n';

    alert(txt);
  } catch (error) {
    console.error('Error fetching status history:', error);
    alert('상태 이력을 가져오는 중 오류가 발생했습니다.');
  }
}

/* ---------------- Modal ---------------- */

function closeModal() {
  document.getElementById('application-modal')?.classList.remove('is-open');
}

window.onclick = function (e) {
  const modal = document.getElementById('application-modal');
  if (e.target === modal) modal.classList.remove('is-open');
};

/* ---------------- Excel 다운로드 ---------------- */

function downloadExcel() {
  if (!_currentEvent || !Array.isArray(_currentParticipants)) {
    alert('데이터 로딩 후 다운로드해주세요.');
    return;
  }

  let csv = '이름(생년),역할[팀](성별),전화번호,신청일시,상태\n';
  _currentParticipants.forEach(p => {
    const date = new Date(p.appliedAt).toLocaleString('ko-KR');
    const status = p.status === 'approved' ? '승인완료' :
                   p.status === 'rejected' ? '거절됨' : '승인대기';
    const phone = maskPhoneNumber(p.phonenumber);
    const row = [
      `${p.name}(${formatBirthYear(p.birthDate)})`,
      `${formatRole(p.role)}[${formatTeam(p.team)}](${p.gender === 'male' ? '남' : '여'})`,
      phone, date, status
    ].map(c => `"${c}"`).join(',');
    csv += row + '\n';
  });

  const blob = new Blob([ + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${_currentEvent.title}_참가자명단.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  fetchEventStatus();

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      _currentSort = e.target.value;
      renderParticipantList();
    });
  }

  // 필터 탭
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.status));
  });
});

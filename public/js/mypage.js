// 사용자 정보 표시
let userData; // 사용자 데이터를 전역 변수로 저장
// 성별 표시 매핑
const genderDisplay = {
  'male': '남성',
  'female': '여성',
  'other': '기타'
};
// 사용자 정보 가져오기 함수 수정
async function fetchUserInfo() {
  try {
    console.log('사용자 정보 요청 시작');
    // 인증 모듈을 사용한 토큰 검증 (이제 nav-injector.js에 통합됨)
    const isAuthenticated = await AuthModule.checkAuthentication();
    if (!isAuthenticated) return;
    
    const response = await fetch('/user/info_database');
    
    if (response.status === 401) {
      console.log('인증되지 않은 요청, 로그인 페이지로 이동');
      AuthModule.redirectToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    userData = data; // 사용자 데이터를 전역 변수에 저장
    console.log(`사용자 정보 가져오기 성공: ${data.displayName}`);

    if (!data) {
      throw new Error('No data received');
    }

    // 프로필 이미지 업데이트
    const userImage = document.getElementById('user-image');
    if (userImage) {
      userImage.src = data.profileImage || '/images/basic_Image.png';
      userImage.onerror = () => {
        userImage.src = '/images/basic_Image.png';
      };
    }

    // 역할 표시 매핑
    const roleDisplay = {
      'officer': '운영진',
      'starter': '스타터',
      'admin': '관리자',
      'participant': '참가자',
      'guest': '게스트'
    };
    const departmentDisplay = {
      'operation' : '운영부',
      'marketing' : '홍보부',
      'planning' : '기획부'
    }

    // 팀 표시 매핑
    const teamDisplay = {
      'operationTeam': '운영팀',
      'cooperationTeam': '대외협력팀',
      'HumanResourceTeam': '인사팀',
      'financeTeam': '재무팀',
      'marketingTeam': '홍보팀',
      'designTeam': '디자인팀',
      'videoTeam': '영상제작팀',
      'PlanningTeam': '기획팀',
      'regularTeam': '정기모임팀',
      'staffTeam': '스태프팀',
      'projectTeam' :'프로젝트팀'
    };

    // 뱃지 이미지 매핑
    const badgeMap = {
      'officer': '/images/officer_badge.png',
      'starter': '/images/starter_badge.png',
      'admin': '/images/admin_badge.png',
      'participant': '/images/participant_badge.png',
      'staff': '/images/staff_badge.png'
    };

    

    // 기본 정보 업데이트
    updateElement('user-name', `이름 : ${data.name || '-'}`);
    // 뱃지 표시
    const badgeSpan = document.getElementById('user-badge');
    const badgeRole = document.getElementById('user-badge-role');
    let badgeImg = '';
    let roleText = '';
    if (data.team === 'staffTeam') {
      badgeImg = `<img src="${badgeMap['staff']}" alt="Staff Badge">`;
      roleText = roleDisplay['officer'] || '운영진';
    } else if (data.role === 'officer') {
      badgeImg = `<img src="${badgeMap['officer']}" alt="Officer Badge">`;
      roleText = roleDisplay['officer'] || '운영진';
    } else if (data.role === 'starter') {
      badgeImg = `<img src="${badgeMap['starter']}" alt="Starter Badge">`;
      roleText = roleDisplay['starter'] || '스타터';
    } else if (data.role === 'admin') {
      badgeImg = `<img src="${badgeMap['admin']}" alt="Admin Badge">`;
      roleText = roleDisplay['admin'] || '관리자';
    } else if (data.role === 'participant') {
      badgeImg = `<img src="${badgeMap['participant']}" alt="Participant Badge">`;
      roleText = roleDisplay['participant'] || '참가자';
    } else {
      badgeImg = '';
      roleText = '';
    }
    if (badgeSpan) {
      badgeSpan.innerHTML = badgeImg + `<div id="user-badge-role">${roleText}</div>`;
    }
    // updateElement('user-role', `역할 : ${roleDisplay[data.role] || data.role || '-'}`); // 역할 텍스트 제거
    updateElement('user-nickname', `프로필 이름 : ${data.displayName || '-'}`);
    updateElement('user-department', `부서 : ${departmentDisplay[data.department] || data.department || '-'}`);
    updateElement('user-team', `팀 이름 : ${teamDisplay[data.team] || data.team || '-'}`);
    updateElement('user-createdAt', `가입일 : ${new Date(data.createdAt).toLocaleDateString()||'-'}`);

    // 추가정보 입력 / 수정 버튼 토글
    // 핵심 필드(이름/성별/전화/선호지역)가 모두 있으면 "수정" 모드, 없으면 "입력" 모드
    const additionalBtn = document.getElementById('additional-info');
    if (additionalBtn) {
      const isAdditionalComplete = !!(data.name && data.gender && data.phonenumber && data.preferredActivity);
      additionalBtn.textContent = isAdditionalComplete ? '추가정보 수정' : '추가정보 입력';
      additionalBtn.dataset.mode = isAdditionalComplete ? 'edit' : 'create';
    }

    // 활동증명서 발급 버튼 노출
    const issueCertBtn = document.getElementById('issue-certificate-btn');
    if (issueCertBtn) {
      issueCertBtn.style.display = 'inline-flex';
    }


    // 활동 정보 업데이트
    updateElement('user-active', `활성상태 : ${data.active ? '✅활동 , * CONTENIDO 동아리 부원임을 인증하는 마크.*'  : '❌비활동 , *비활동부원 또는 게스트*'}`);
    updateElement('user-warningcount', `경고 횟수 : ${data.warningCount || 0}`);
    updateElement('user-totalcount', `총 참가 횟수 : ${data.participationCount?.totalCount || 0}`);
    updateElement('user-regularcount', `정기 참가 횟수 : ${data.participationCount?.regularCount || 0}`);

    // 각 섹션 표시
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('activity-info').style.display = 'block';
    document.getElementById('personal-info').style.display = 'none'; // 개인정보는 처음에 숨김

  } catch (error) {
    console.error('Error fetching user info:', error);
    alert('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
    
    // 로그인 페이지로 리디렉션
    AuthModule.redirectToLogin();
  }
}

// 요소 업데이트 헬퍼 함수
function updateElement(id, text, isEditable = false) {
  const element = document.getElementById(id);
  if (element) {
    if (isEditable) {
      const value = text.split(' : ')[1];
      element.innerHTML = `
        <div class="editable-field">
          <span>${text}</span>
          <button class="edit-button" onclick="showEditForm('${id}', '${value}')">수정</button>
          <div class="edit-form" style="display: none;">
            ${id === 'user-preferred-activity' ? 
              `<select id="${id}-input">
                <option value="">선택하세요</option>
                <option value="강남구">강남구</option>
                <option value="강동구">강동구</option>
                <option value="강북구">강북구</option>
                <option value="강서구">강서구</option>
                <option value="관악구">관악구</option>
                <option value="광진구">광진구</option>
                <option value="구로구">구로구</option>
                <option value="금천구">금천구</option>
                <option value="노원구">노원구</option>
                <option value="도봉구">도봉구</option>
                <option value="동대문구">동대문구</option>
                <option value="동작구">동작구</option>
                <option value="마포구">마포구</option>
                <option value="서대문구">서대문구</option>
                <option value="서초구">서초구</option>
                <option value="성동구">성동구</option>
                <option value="성북구">성북구</option>
                <option value="송파구">송파구</option>
                <option value="양천구">양천구</option>
                <option value="영등포구">영등포구</option>
                <option value="용산구">용산구</option>
                <option value="은평구">은평구</option>
                <option value="종로구">종로구</option>
                <option value="중구">중구</option>
                <option value="중랑구">중랑구</option>
              </select>` :
              `<input type="text" id="${id}-input" value="${value}" ${id === 'user-phonenumber' ? 'pattern="[0-9]{11}"' : ''}/>`
            }
            <button onclick="saveEdit('${id}')">저장</button>
            <button onclick="cancelEdit('${id}')">취소</button>
          </div>
        </div>
      `;
    } else {
      element.innerText = text;
    }
  }
}

function showEditForm(id, currentValue) {
  const container = document.getElementById(id);
  const editForm = container.querySelector('.edit-form');
  const input = document.getElementById(`${id}-input`);
  
  if (id === 'user-preferred-activity' && currentValue !== '-') {
    input.value = currentValue;
  }
  
  editForm.style.display = 'block';
  container.querySelector('.edit-button').style.display = 'none';
}

function cancelEdit(id) {
  const container = document.getElementById(id);
  container.querySelector('.edit-form').style.display = 'none';
  container.querySelector('.edit-button').style.display = 'inline';
}

async function saveEdit(id) {
  const input = document.getElementById(`${id}-input`);
  const value = input.value;

  if (id === 'user-phonenumber' && !/^[0-9]{11}$/.test(value)) {
    alert('전화번호는 11자리 숫자여야 합니다.');
    return;
  }

  try {
    console.log(`프로필 정보 업데이트 시도: ${id}`);
    const field = id === 'user-phonenumber' ? 'phonenumber' : 'preferredActivity';
    const response = await fetch(`/user/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [field]: value
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || '프로필 업데이트에 실패했습니다.');
    }

    console.log(`프로필 정보 업데이트 성공: ${field}=${value}`);
    // 성공적으로 업데이트된 경우 UI 갱신
    fetchUserInfo();
    cancelEdit(id);
  } catch (error) {
    console.error('Error updating profile:', error);
    alert(error.message || '프로필 업데이트 중 오류가 발생했습니다.');
  }
}

// 신청한 이벤트와 참여한 이벤트를 가져오는 함수
async function fetchUserEvents() {
  try {
    console.log('사용자 이벤트 정보 요청');
    // 현재 사용자 정보 가져오기
    const userResponse = await fetch('/user/info');
    if (!userResponse.ok) {
      throw new Error('사용자 정보를 가져올 수 없습니다.');
    }
    
    const user = await userResponse.json();
    currentUserId = user.id;
    console.log(`로그인된 사용자 ID: ${user.id}`);

    // 모든 이벤트 가져오기
    const eventsResponse = await fetch('/events');
    const events = await eventsResponse.json();
    currentUserEventsList = events;
    console.log(`전체 이벤트 ${events.length}개 로드 완료`);

    // 종료된 이벤트 가져오기
    const endedEventsResponse = await fetch('/events/ended');
    const endedEvents = await endedEventsResponse.json();
    console.log(`종료된 이벤트 ${endedEvents.length}개 로드 완료`);

    // 신청한 이벤트 필터링 (진행 중인 이벤트 중에서, 취소된 신청은 제외)
    const appliedEvents = events.filter(event => 
      event.appliedParticipants.some(p => p.userId === user.id && !p.isGuest && p.status !== 'cancelled')
    );
    console.log(`신청한 이벤트 ${appliedEvents.length}개 필터링 완료`);

    // 참여한 이벤트 필터링 (종료된 이벤트 중에서)
    const participatedEvents = endedEvents.filter(event => 
      event.finalParticipants && event.finalParticipants.includes(user.id)
    );
    console.log(`참여한 이벤트 ${participatedEvents.length}개 필터링 완료`);

    displayEvents('applied-events', appliedEvents, '신청한 이벤트가 없습니다.');
    displayEvents('participated-events', participatedEvents, '참여한 이벤트가 없습니다.');
  } catch (error) {
    console.error('Error fetching events:', error);
    const appliedEvents = document.getElementById('applied-events');
    const participatedEvents = document.getElementById('participated-events');
    
    appliedEvents.innerHTML = '<p class="error-message">이벤트 정보를 불러오는데 실패했습니다.</p>';
    participatedEvents.innerHTML = '<p class="error-message">이벤트 정보를 불러오는데 실패했습니다.</p>';
  }
}

// 이벤트 목록을 화면에 표시하는 함수
let currentUserId = null;
let currentUserEventsList = [];

window.openInvitationModal = async function(eventId) {
  const event = currentUserEventsList.find(e => e._id === eventId);
  if (!event || !userData || !window.showInvitationModal) {
    alert('초대장 정보를 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
    return;
  }
  try {
    const res = await fetch(`/events/${eventId}/invite-token`);
    if (!res.ok) {
      throw new Error('초대장 토큰 생성에 실패했습니다.');
    }
    const data = await res.json();
    window.showInvitationModal(event, userData, data.inviteToken);
  } catch (err) {
    console.error('Error opening invitation modal:', err);
    alert('초대장 링크를 생성하는 중 오류가 발생했습니다.');
  }
};

function displayEvents(containerId, events, emptyMessage) {
  const container = document.getElementById(containerId);
  if (events.length === 0) {
    container.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = events.map(event => {
    let companionBadge = '';
    let inviteBtn = '';

    if (containerId === 'applied-events' && currentUserId && Array.isArray(event.appliedParticipants)) {
      // 초대된 동반 지인 목록
      const guestApps = event.appliedParticipants.filter(p => p.isGuest && String(p.inviterUserId) === String(currentUserId) && p.status !== 'cancelled');
      if (guestApps.length > 0) {
        const names = guestApps.map(g => {
          const info = g.guestInfo || {};
          const gStr = info.gender === 'female' ? '여' : (info.gender === 'male' ? '남' : '');
          const ageStr = info.age ? `${info.age}세` : '';
          const meta = [gStr, ageStr].filter(Boolean).join(' ');
          const statusKOR = g.status === 'approved' ? '승인' : (g.status === 'pending' ? '대기' : g.status);
          return `${info.name || '지인'}(${meta} · ${statusKOR})`;
        }).join(', ');
        companionBadge = `<div style="margin-top: 6px; font-size: 0.82rem; color: #0284c7; font-weight: bold;">👥 초대된 동반 지인 (${guestApps.length}명): ${names}</div>`;
      }

      // 초대장 보내기 버튼 (지인 동반 허용 이벤트인 경우에만 생성!)
      const myApp = event.appliedParticipants.find(p => String(p.userId || p.userId?._id) === String(currentUserId) && !p.isGuest);
      if (event.allowCompanions && myApp && (myApp.status === 'pending' || myApp.status === 'approved')) {
        inviteBtn = `
          <div class="event-actions" style="margin-top: 10px;">
            <button type="button" class="invitation-btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; border-radius: 10px; padding: 8px 14px; font-weight: 700; font-size: 0.84rem; cursor: pointer; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);" onclick="event.stopPropagation(); openInvitationModal('${event._id}')">
              ✉️ 지인 초대장 보내기
            </button>
          </div>
        `;
      }
    }

    return `
      <div class="event-item">
        <div class="event-content" onclick="goToEventDetails('${event._id}')">
          <div class="event-title">${event.title}</div>
          <div class="event-details">
            <div>일시: ${new Date(event.date).toLocaleDateString()} ${event.startTime} ~ ${event.endTime}</div>
            <div>장소: ${event.place}</div>
            <div>참가비: ${event.participation_fee.toLocaleString()}원</div>
            ${companionBadge}
            <div class="event-status ${getStatusClass(event, containerId)}">
              ${getEventStatus(event, containerId)}
            </div>
          </div>
        </div>
        ${inviteBtn}
        ${containerId === 'participated-events' ? `
          <div class="event-actions">
            <button class="review-button" onclick="goToEventReview('${event._id}')">
              리뷰 남기기
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(event, containerId) {
  if (containerId === 'participated-events') {
    return 'status-completed';
  }
  
  const participant = event.appliedParticipants.find(p => p.userId === userData.id);
  if (!participant) return 'status-pending';
  if (participant.status === 'cancelled') return 'status-cancelled';
  if (participant.status === 'rejected') return 'status-rejected';
  return participant.status === 'approved' ? 'status-approved' : 'status-pending';
}

// 이벤트 상태를 반환하는 함수
function getEventStatus(event, containerId) {
  if (containerId === 'participated-events') {
    return '참여 완료';
  }
  
  // 신청한 이벤트의 경우
  const participant = event.appliedParticipants.find(p => p.userId === userData.id);
  if (!participant) return '상태 확인 불가';
  if (participant.status === 'cancelled') return '신청 취소됨';
  if (participant.status === 'rejected') return '반려됨';
  return participant.status === 'approved' ? '참가 확정' : '승인 대기중';
}

// 이벤트 상세 페이지로 이동하는 함수
function goToEventDetails(eventId) {
  window.location.href = `additional-info.html?id=${eventId}`;
}

// 리뷰 페이지로 이동하는 함수 추가
function goToEventReview(eventId) {
  window.location.href = `event-review.html?id=${eventId}`;
}

// 생년월일 확인 후 개인정보 표시 함수 수정
function showPersonalInfo() {
  const inputBirthdate = document.getElementById('birthdate-input').value;
  if (!userData || !userData.birthDate) {
    alert('사용자 정보가 올바르게 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
    return;
  }
  
  const userBirthdate = new Date(userData.birthDate).toISOString().slice(2, 10).replace(/-/g, '');
  console.log(`입력한 생년월일: ${inputBirthdate}, 실제 생년월일: ${userBirthdate}`);

  if (inputBirthdate === userBirthdate) {
    console.log('생년월일 일치, 개인정보 표시');
    // 개인정보 업데이트 및 표시
    const genderDisplay = {
      'male': '남성',
      'female': '여성',
      'other': '기타'
    };
    
    updateElement('user-email', `이메일 : ${userData.email || '-'}`);
    updateElement('user-phonenumber', `전화번호 : ${userData.phonenumber || '-'}`, true);
    updateElement('user-gender', `성별 : ${genderDisplay[userData.gender] || '-'}`);
    updateElement('user-birthdate', `생년월일 : ${new Date(userData.birthDate).toISOString().slice(0, 10).replace(/-/g, '.')}`);
    updateElement('user-preferred-activity', `선호 활동 지역 : ${userData.preferredActivity || '-'}`, true);

    document.getElementById('personal-info').style.display = 'block';
    document.getElementById('birthdate-input-container').style.display = 'none';
  } else {
    alert('생년월일이 일치하지 않습니다.');
  }
}

// 페이지 로드 시 실행
// ── 계정 연동 (카카오 ↔ 이메일/비번) ──
function setLinkRow(id, label, on, onText, offText) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label + ' ';
  const badge = document.createElement('span');
  badge.className = 'link-badge ' + (on ? 'is-on' : 'is-off');
  badge.textContent = on ? onText : offText;
  el.appendChild(badge);
}

async function loadLinkStatus() {
  try {
    const res = await fetch('/auth/link-status');
    if (!res.ok) return;
    const s = await res.json();
    document.getElementById('link-email').textContent = `아이디(이메일): ${s.email || '-'}`;
    setLinkRow('link-kakao-status', '카카오 로그인', s.hasKakao, '연동됨', '미연동');
    setLinkRow('link-password-status', '비밀번호 로그인', s.hasPassword, '설정됨', '미설정');

    const actions = document.getElementById('link-actions');
    actions.innerHTML = '';
    if (!s.hasKakao) {
      const b = document.createElement('button');
      b.className = 'link-btn link-btn--kakao';
      b.textContent = '카카오 연동';
      b.addEventListener('click', () => { window.location.href = '/auth/link-kakao'; });
      actions.appendChild(b);
    }
    const pwBtn = document.createElement('button');
    pwBtn.className = 'link-btn ' + (s.hasPassword ? 'link-btn--ghost' : 'link-btn--primary');
    pwBtn.textContent = s.hasPassword ? '비밀번호 변경' : '비밀번호 설정';
    pwBtn.addEventListener('click', () => {
      const form = document.getElementById('link-password-form');
      const show = form.style.display === 'none' || !form.style.display;
      form.style.display = show ? 'block' : 'none';
      document.getElementById('link-current-password').style.display = (show && s.hasPassword) ? 'block' : 'none';
    });
    actions.appendChild(pwBtn);
  } catch (e) { console.error('연동 상태 로드 실패', e); }
}

async function submitLinkPassword() {
  const password = document.getElementById('link-password-input').value;
  const currentPassword = document.getElementById('link-current-password').value;
  if (!password || password.length < 8) { alert('비밀번호는 8자 이상이어야 합니다.'); return; }
  try {
    const res = await fetch('/auth/link-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, currentPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || '저장되었습니다.');
      document.getElementById('link-password-form').style.display = 'none';
      document.getElementById('link-password-input').value = '';
      document.getElementById('link-current-password').value = '';
      loadLinkStatus();
    } else {
      alert(data.message || '저장에 실패했습니다.');
    }
  } catch (e) { alert('오류가 발생했습니다.'); }
}

function handleLinkQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('linked') === 'kakao') {
    alert('카카오 연동이 완료되었습니다.');
    history.replaceState(null, '', '/mypage.html');
  } else if (params.get('linkError')) {
    alert('카카오 연동 실패: ' + params.get('linkError'));
    history.replaceState(null, '', '/mypage.html');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('마이페이지 로드');
  fetchUserInfo();
  fetchUserEvents();

  // 개인 정보 보기 버튼 클릭 이벤트
  document.getElementById('toggle-personal-info').addEventListener('click', () => {
    document.getElementById('birthdate-input-container').style.display = 'block';
    document.getElementById('toggle-personal-info').style.display = 'none';
  });
  //추가 정보 입력/수정 버튼 이벤트
  document.getElementById("additional-info").addEventListener("click", (e) => {
    const isEdit = e.currentTarget.dataset.mode === 'edit';
    window.location.href = isEdit
      ? '/additional-user-info.html?edit=1'
      : '/additional-user-info.html';
  });

  // 생년월일 확인 버튼 클릭 이벤트
  document.getElementById('confirm-birthdate').addEventListener('click', showPersonalInfo);

  // 계정 연동
  loadLinkStatus();
  handleLinkQuery();
  document.getElementById('link-password-submit').addEventListener('click', submitLinkPassword);
  document.getElementById('link-password-cancel').addEventListener('click', () => {
    document.getElementById('link-password-form').style.display = 'none';
  });

  // 활동증명서 이벤트 바인딩
  const issueCertBtn = document.getElementById('issue-certificate-btn');
  if (issueCertBtn) {
    issueCertBtn.addEventListener('click', handleCertificateClick);
  }
  document.getElementById('cert-btn-close').addEventListener('click', closeCertificateModal);
  document.getElementById('cert-btn-print').addEventListener('click', printCertificate);
  document.getElementById('cert-btn-pdf').addEventListener('click', downloadCertificatePDF);
});

// ── 활동증명서 관련 함수 정의 ──
async function handleCertificateClick() {
  try {
    const res = await fetch('/user/certificate/issue', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.message || '활동증명서 발급에 실패했습니다.');
      return;
    }

    const responseData = await res.json();
    const data = responseData.data;
    
    // 모달 데이터 기입
    document.getElementById('cert-serial-number').textContent = data.serialNumber;
    document.getElementById('cert-user-name').textContent = data.name || '-';
    
    // 직위 표시 매핑
    const roleMap = {
      'admin': '관리자',
      'officer': '운영진',
      'starter': '스타터',
      'participant': '참가자'
    };
    document.getElementById('cert-user-role').textContent = roleMap[data.role] || data.role || '부원';
    
    // 직책 표시 계산
    let positionText = '-';
    if (data.role === 'officer' || data.role === 'admin') {
      const deptMap = {
        'planning': '기획부',
        'operation': '운영부',
        'promotion': '홍보부',
        'marketing': '홍보부'
      };
      
      const teamMap = {
        'operationTeam': '운영팀',
        'cooperationTeam': '대외협력팀',
        'HumanResourceTeam': '인사팀',
        'financeTeam': '재무팀',
        'marketingTeam': '홍보팀',
        'designTeam': '디자인팀',
        'videoTeam': '영상제작팀',
        'PlanningTeam': '기획팀',
        'regularTeam': '정기모임', // '팀' 생략하여 정기모임(팀장)으로 표기
        'staffTeam': '스태프팀',
        'projectTeam': '프로젝트팀'
      };
      
      const deptStr = deptMap[data.department] || '';
      
      if (data.isDepartmentHead) {
        positionText = `${deptStr}(부장)`;
      } else {
        const teamStr = teamMap[data.team] || data.team || '';
        const titleStr = data.isTeamLeader ? '팀장' : '팀원';
        positionText = teamStr ? `${deptStr} ${teamStr}(${titleStr})` : `${deptStr}(${titleStr})`;
      }
    }
    document.getElementById('cert-user-position').textContent = positionText;
    
    // 날짜 포맷팅 함수
    const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}년 ${m}월 ${day}일`;
    };
    
    const startStr = formatDate(data.joinDate);
    const endStr = formatDate(data.issueDate);
    document.getElementById('cert-activity-period').textContent = `${startStr} - ${endStr}`;
    
    // 활동 내용 텍스트 설정
    const contentText = (data.role === 'officer' || data.role === 'admin')
      ? '귀하는 콘테니도 동아리에서 운영진으로서<br>창의적이고 주도적인 기획 역량을 발휘하여<br>성공적인 이벤트 운영에 기여하였기에 이를 인증합니다.'
      : '귀하는 콘테니도 동아리에서 참가자로서<br>성실하고 모범적인 언행과 높은 사회성을 발휘하여<br>성공적인 이벤트 운영에 기여하였기에 이를 인증합니다.';
    document.getElementById('cert-activity-content').innerHTML = contentText;
    
    // 발급 날짜 기입
    document.getElementById('cert-issue-date').textContent = endStr;
    
    // 모달 활성화 및 배경 스크롤 차단
    const modal = document.getElementById('certificate-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('활동증명서 모달 처리 오류:', error);
    alert('활동증명서를 처리하는 중 오류가 발생했습니다.');
  }
}

function closeCertificateModal() {
  document.getElementById('certificate-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function printCertificate() {
  const prevTitle = document.title;
  const prevUrl = window.location.pathname + window.location.search;
  
  document.title = 'CONTENIDO';
  try {
    history.replaceState(null, '', '/'); // Change URL to root path (so that footer prints as host only e.g. contenido.kr)
  } catch (e) {
    console.error('URL replaceState failed:', e);
  }
  
  window.print();
  
  // Restore immediately
  document.title = prevTitle;
  try {
    history.replaceState(null, '', prevUrl);
  } catch (e) {
    console.error('URL restore failed:', e);
  }
}

function downloadCertificatePDF() {
  const element = document.getElementById('certificate-print-area');
  const name = document.getElementById('cert-user-name').textContent.trim() || '부원';
  
  const opt = {
    margin: 0,
    filename: `활동증명서_${name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2.5, 
      useCORS: true, 
      logging: false 
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: 'avoid-all' }
  };
  
  // PDF 변환 시 박스 섀도우를 임시로 지웠다 복원
  const prevBoxShadow = element.style.boxShadow;
  element.style.boxShadow = 'none';
  
  html2pdf().set(opt).from(element).save().then(() => {
    element.style.boxShadow = prevBoxShadow;
  });
}

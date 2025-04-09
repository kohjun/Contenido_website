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
      'starterTeam' :'스타터팀'
    };


    // 기본 정보 업데이트
    updateElement('user-name', `이름 : ${data.name || '-'}`);
    updateElement('user-nickname', `프로필 이름 : ${data.displayName || '-'}`);
    updateElement('user-role', `역할 : ${roleDisplay[data.role] || data.role || '-'}`);
    updateElement('user-department', `부서 : ${departmentDisplay[data.department] || data.department || '-'}`);
    updateElement('user-team', `팀 이름 : ${teamDisplay[data.team] || data.team || '-'}`);

    // 활동 정보 업데이트
    updateElement('user-active', `활성상태 : ${data.active ? '✅활동 , *동아리 부원임을 인증하는 마크입니다.*'  : '❌비활동 , *동아리 부원이 아님을 인증하는 마크입니다.*'}`);
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
      throw new Error('프로필 업데이트에 실패했습니다.');
    }

    console.log(`프로필 정보 업데이트 성공: ${field}=${value}`);
    // 성공적으로 업데이트된 경우 UI 갱신
    fetchUserInfo();
    cancelEdit(id);
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('프로필 업데이트 중 오류가 발생했습니다.');
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
    console.log(`로그인된 사용자 ID: ${user.id}`);

    // 모든 이벤트 가져오기
    const eventsResponse = await fetch('/events');
    const events = await eventsResponse.json();
    console.log(`전체 이벤트 ${events.length}개 로드 완료`);

    // 종료된 이벤트 가져오기
    const endedEventsResponse = await fetch('/events/ended');
    const endedEvents = await endedEventsResponse.json();
    console.log(`종료된 이벤트 ${endedEvents.length}개 로드 완료`);

    // 신청한 이벤트 필터링 (진행 중인 이벤트 중에서)
    const appliedEvents = events.filter(event => 
      event.appliedParticipants.some(p => p.userId === user.id)
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
function displayEvents(containerId, events, emptyMessage) {
  const container = document.getElementById(containerId);
  if (events.length === 0) {
    container.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = events.map(event => `
    <div class="event-item" onclick="goToEventDetails('${event._id}')">
      <div class="event-title">${event.title}</div>
      <div class="event-details">
        <div>일시: ${new Date(event.date).toLocaleDateString()} ${event.startTime} ~ ${event.endTime}</div>
        <div>장소: ${event.place}</div>
        <div>참가비: ${event.participation_fee.toLocaleString()}원</div>
        <div class="event-status ${getStatusClass(event, containerId)}">
          ${getEventStatus(event, containerId)}
        </div>
      </div>
    </div>
  `).join('');
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(event, containerId) {
  if (containerId === 'participated-events') {
    return 'status-completed';
  }
  
  const participant = event.appliedParticipants.find(p => p.userId === userData.id);
  if (!participant) return 'status-pending';
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
  return participant.status === 'approved' ? '참가 확정' : '승인 대기중';
}

// 이벤트 상세 페이지로 이동하는 함수
function goToEventDetails(eventId) {
  window.location.href = `event-detail.html?id=${eventId}`;
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
document.addEventListener('DOMContentLoaded', () => {
  console.log('마이페이지 로드');
  fetchUserInfo();
  fetchUserEvents();

  // 개인 정보 보기 버튼 클릭 이벤트
  document.getElementById('toggle-personal-info').addEventListener('click', () => {
    document.getElementById('birthdate-input-container').style.display = 'block';
    document.getElementById('toggle-personal-info').style.display = 'none';
  });
  //추가 정보 입력 버튼 이벤트
  document.getElementById("additional-info").addEventListener("click", () => {
    window.location.href = "/additional-user-info.html";
  });

  // 생년월일 확인 버튼 클릭 이벤트
  document.getElementById('confirm-birthdate').addEventListener('click', showPersonalInfo);
});

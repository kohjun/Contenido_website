const eventAccessMap = new Map();

// 역할 한글 표시 함수
function formatRole(role) {
  switch(role) {
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
  switch(team) {
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
    case 'starterTeam': return '스타터팀';
    default: return team || '-';
  }
}
// 생년월일에서 년도만 추출하여 포맷팅하는 함수
function formatBirthYear(birthDate) {
  if (!birthDate) return '';
  
  const year = new Date(birthDate).getFullYear();
  const shortYear = year.toString().slice(2);
  return shortYear;
}

// 성별 표시 함수
function formatGender(gender) {
  const genderText = gender === 'male' ? '남' : gender === 'female' ? '여' : '기타';
  const genderClass = `gender-${gender || 'other'}`;
  return `<span class="${genderClass}">${genderText}</span>`;
}

async function fetchEventStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  if (!eventId) {
    alert('이벤트 ID가 없습니다.');
    return;
  }

  // 첫 접근인 경우에만 접근 코드 확인
  if (!eventAccessMap.has(eventId)) {
    const hasAccess = await verifyEventAccess(eventId);
    if (!hasAccess) {
      window.location.href = "event-staff.html";
      return;
    }
    eventAccessMap.set(eventId, true);
  }

  try {
    const eventResponse = await fetch(`/events/${eventId}`);
    const event = await eventResponse.json();
    const participantsResponse = await fetch(`/events/${eventId}/participants`);
    const participantsData = await participantsResponse.json();

    // 승인된 참가자 수 계산
    const approvedCount = event.appliedParticipants.filter(p => p.status === 'approved').length;

    document.getElementById('event-details').innerHTML = `
      <p><strong>제목:</strong> ${event.title}</p>
      <p><strong>날짜:</strong> ${new Date(event.date).toLocaleDateString()}</p>
      <p><strong>승인된 참가자:</strong> ${approvedCount}/${event.participants}명</p>
      <p><strong>총 신청자:</strong> ${event.appliedParticipants.length}명</p>
      ${event.isSelective ? '<p><strong>유형:</strong> <span class="selective-badge">선별적 이벤트</span></p>' : '<p><strong>유형:</strong> <span class="selective-badge">일반 이벤트</span></p>'}
    `;

    if (event.isSelective) {
      // 지원서가 필요한 선별적 이벤트인 경우
      document.getElementById('participant-table').classList.add('hidden');
      document.getElementById('application-list').innerHTML = `
        <h2>지원서 목록</h2>
        ${participantsData.participants.map(participant => `
          <div class="application-item" id="application-${participant.userId}">
        <div class="application-header">
          <div class="participant-info">
        <h3>${participant.name}(${formatBirthYear(participant.birthDate)})</h3>
          </div>
          <div class="application-actions">
        ${participant.status === 'approved' ? 
          '<span class="status-confirmed">✓ 참가확정</span>' :
          participant.status === 'rejected' ?
          '<span class="status-rejected">거절됨</span>' :
          `<button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'approved')" class="approve-btn">승인</button>
           <button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'rejected')" class="reject-btn">거절</button>`
        }
          </div>
        </div>
        <p><strong>역할:</strong> ${formatRole(participant.role)}</p>
        <p><strong>팀(성별):</strong> ${formatTeam(participant.team)}(${formatGender(participant.gender)})</p>
        <p><strong>전화번호:</strong> ${participant.phonenumber || '-'}</p>
        <p><strong>신청일시:</strong> ${new Date(participant.appliedAt).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        ${participant.answers ? participant.answers.map((answer, index) => {
          // 추가 질문이 존재하는지 확인
          if (event.additionalQuestions && event.additionalQuestions[index]) {
        return `
          <div class="answer-section">
        <p class="question-text">Q${index + 1}. ${event.additionalQuestions[index].questionText}</p>
        <div class="answer-text">${answer.answerText}</div>
          </div>
        `;
          } else {
        return `
          <div class="answer-section">
        <p class="question-text">Q${index + 1}. 질문이 없습니다</p>
        <div class="answer-text">${answer.answerText}</div>
          </div>
        `;
          }
        }).join('') : '<p>지원서가 없습니다.</p>'}
          </div>
        `).join('')}
      `;
    } else {
      // 일반 이벤트인 경우 기존 표 형식 유지
      document.getElementById('participant-table').classList.remove('hidden');
      const participantList = document.getElementById('participant-list');
      participantList.innerHTML = participantsData.participants
        .map(participant => {
          const appliedDate = new Date(participant.appliedAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          const canApprove = approvedCount < event.participants;
          const statusText = formatStatus(participant.status || 'pending');

          let buttonsHtml = '';
          if (participant.status === 'approved') {
            buttonsHtml = '<span class="status-confirmed">✓ 참가확정</span>';
          } else if (participant.status === 'rejected') {
            buttonsHtml = '<span class="status-rejected">거절됨</span>';
          } else {
            buttonsHtml = `
              <button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'approved')" 
                      class="approve-btn"
                      ${!canApprove ? 'disabled title="최대 승인 인원에 도달했습니다"' : ''}>
                승인
              </button>
              <button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'rejected')" 
                      class="reject-btn">
                거절
              </button>
            `;
          }

            return `
            <tr data-user-id="${participant.userId}">
              <td>${participant.name}(${formatBirthYear(participant.birthDate)})</td>
              <td>${formatRole(participant.role)}[${formatTeam(participant.team)}](${formatGender(participant.gender)})</td>
              <td>${participant.phonenumber || '-'}</td>
              <td>${appliedDate}</td>
              <td>${statusText}</td>
              <td>${buttonsHtml}</td>
            </tr>
            `;
        })
        .join('');
    }
  } catch (error) {
    console.error('Error fetching event status:', error);
    alert('참가 현황을 가져오는 중 오류가 발생했습니다.');
  }
}

// 지원서 보기 모달 함수 
function viewApplication(participantId) {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  
  // 이벤트와 참가자 정보를 다시 가져와야 함
  fetch(`/events/${eventId}`)
    .then(response => response.json())
    .then(event => {
      // 참가자 세부 정보도 가져오기
      fetch(`/events/${eventId}/participants`)
        .then(response => response.json())
        .then(participantsData => {
          const participant = participantsData.participants.find(p => p.userId === participantId);
          if (!participant || !participant.answers) return;

          const modal = document.getElementById('application-modal');
          const content = document.getElementById('application-content');

            content.innerHTML = `
            <h3>${participant.name}(${formatBirthYear(participant.birthDate)})님의 지원서</h3>
            <p><strong>역할[팀](성별):</strong> ${formatRole(participant.role)}[${formatTeam(participant.team)}](${formatGender(participant.gender)})</p>
            <p><strong>전화번호:</strong> ${participant.phonenumber || '-'}</p>
            <p><strong>신청일시:</strong> ${new Date(participant.appliedAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            ${participant.answers.map((answer, index) => {
              if (event.additionalQuestions && event.additionalQuestions[index]) {
              return `
                <div class="answer-section">
                <p class="question-text">Q${index + 1}. ${event.additionalQuestions[index].questionText}</p>
                <div class="answer-text">${answer.answerText}</div>
                </div>
              `;
              } else {
              return `
                <div class="answer-section">
                <p class="question-text">Q${index + 1}. 질문이 없습니다</p>
                <div class="answer-text">${answer.answerText}</div>
                </div>
              `;
              }
            }).join('')}
            `;

          modal.style.display = 'block';
        })
        .catch(error => {
          console.error('Error loading participant data:', error);
          alert('참가자 정보를 불러오는 중 오류가 발생했습니다.');
        });
    })
    .catch(error => {
      console.error('Error loading event data:', error);
      alert('이벤트 정보를 불러오는 중 오류가 발생했습니다.');
    });
}

function closeModal() {
  document.getElementById('application-modal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
  const modal = document.getElementById('application-modal');
  if (event.target == modal) {
    modal.style.display = 'none';
  }
};

async function verifyEventAccess(eventId) {
  const accessCode = prompt('이벤트 접근 코드를 입력하세요 (4자리):');
  
  if (!accessCode) {
    return false;
  }

  try {
    const response = await fetch(`/events/${eventId}/verify-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessCode })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.message);
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403) {
        const hasAccess = await verifyEventAccess(eventId);
        if (hasAccess) {
          return await updateParticipantStatus(eventId, userId, status);
        }
        window.location.href = "event-staff.html";
        return;
      }
      throw new Error(error.message);
    }

    // 상태 변경 알림
    alert(status === 'approved' ? '참가자가 승인되었습니다.' : '참가 신청이 거절되었습니다.');

    // 전체 데이터 다시 로드
    await fetchEventStatus();

  } catch (error) {
    console.error('Error:', error);
    alert(error.message || '상태 업데이트 중 오류가 발생했습니다.');
  }
}

function formatStatus(status) {
  switch(status) {
    case 'pending': 
      return '<span class="status status-pending">승인대기</span>';
    case 'approved': 
      return '<span class="status status-approved">승인완료</span>';
    case 'rejected': 
      return '<span class="status status-rejected">거절됨</span>';
    default: 
      return '<span class="status status-pending">승인대기</span>';
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 전화번호 마스킹 함수 추가
function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber === '-') return '-';
  
  // 전화번호에서 숫자만 추출
  const numbers = phoneNumber.replace(/[^0-9]/g, '');
  
  if (numbers.length === 11) {
    return `${numbers.slice(0,3)}-****-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    return `${numbers.slice(0,3)}-***-${numbers.slice(6)}`;
  } else {
    return phoneNumber; // 형식이 다른 경우 원본 반환
  }
}

// 엑셀 다운로드 함수 수정
function downloadExcel() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  
  // 이벤트와 참가자 정보를 가져오기
  Promise.all([
    fetch(`/events/${eventId}`).then(res => res.json()),
    fetch(`/events/${eventId}/participants`).then(res => res.json())
  ]).then(([event, participantsData]) => {
    let csvContent = "이름(생년),역할[팀](성별),전화번호,신청일시,상태\n";
    
    participantsData.participants.forEach(participant => {
      const appliedDate = new Date(participant.appliedAt).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const status = participant.status === 'approved' ? '승인완료' : 
                     participant.status === 'rejected' ? '거절됨' : '승인대기';
      
      // 전화번호 마스킹 처리 추가
      const maskedPhone = maskPhoneNumber(participant.phonenumber);
      
      // CSV 행 생성
      const row = [
        `${participant.name}(${formatBirthYear(participant.birthDate)})`,
        `${formatRole(participant.role)}[${formatTeam(participant.team)}](${participant.gender === 'male' ? '남' : '여'})`,
        maskedPhone,
        appliedDate,
        status
      ].map(cell => `"${cell}"`).join(',');
      
      csvContent += row + '\n';
    });
    
    // CSV 파일 다운로드
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title}_참가자명단.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }).catch(error => {
    console.error('Error downloading Excel:', error);
    alert('엑셀 다운로드 중 오류가 발생했습니다.');
  });
}

// Initialize event status page
document.addEventListener('DOMContentLoaded', fetchEventStatus);

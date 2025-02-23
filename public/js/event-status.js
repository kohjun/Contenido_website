const eventAccessMap = new Map();

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
              <h3>${participant.name}님의 지원서</h3>
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
            <p><strong>성별:</strong> ${participant.gender === 'male' ? '남' : participant.gender === 'female' ? '여' : '그외'}</p>
            <p><strong>전화번호:</strong> ${participant.phonenumber || '-'}</p>
            <p><strong>신청일시:</strong> ${new Date(participant.appliedAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            ${participant.answers ? participant.answers.map((answer, index) => `
              <div class="answer-section">
                <p class="question-text">Q${index + 1}. ${event.additionalQuestions[index].questionText}</p>
                <div class="answer-text">${answer.answerText}</div>
              </div>
            `).join('') : '<p>지원서가 없습니다.</p>'}
          </div>
        `).join('')}
      `;
    } else {
      // 일반 이벤트인 경우 기존 표 형식 유지
      document.getElementById('participant-table').classList.remove('hidden');
      const participantList = document.getElementById('participant-list');
      participantList.innerHTML = participantsData.participants
        .map(participant => {
          const genderDisplay = participant.gender === 'male' ? '남' : participant.gender === 'female' ? '여' : '그외';
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
              <td>${participant.name}</td>
              <td>${genderDisplay}</td>
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

// 지원서 보기 모달 함수 추가
function viewApplication(participantId) {
  const participant = event.appliedParticipants.find(p => p.userId === participantId);
  if (!participant || !participant.answers) return;

  const modal = document.getElementById('application-modal');
  const content = document.getElementById('application-content');

  content.innerHTML = `
    <h3>${participant.name}님의 지원서</h3>
    ${participant.answers.map((answer, index) => `
      <div class="answer-section">
        <p class="question-text">Q${index + 1}. ${event.additionalQuestions[index].questionText}</p>
        <div class="answer-text">${answer.answerText}</div>
      </div>
    `).join('')}
  `;

  modal.style.display = 'block';
}

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

// Initialize event status page
document.addEventListener('DOMContentLoaded', fetchEventStatus);
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
    `;

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
        
        return `
          <tr data-user-id="${participant.userId}">
            <td>${participant.name}</td>
            <td>${genderDisplay}</td>
            <td>${participant.phonenumber || '-'}</td>
            <td>${appliedDate}</td>
            <td>${formatStatus(participant.status || 'pending')}</td>
            <td>
              ${(participant.status || 'pending') === 'pending' ? `
                <button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'approved')" 
                        class="approve-btn"
                        ${!canApprove ? 'disabled title="최대 승인 인원에 도달했습니다"' : ''}>
                  승인
                </button>
                <button onclick="updateParticipantStatus('${eventId}', '${participant.userId}', 'rejected')" 
                        class="reject-btn">
                  거절
                </button>
              ` : participant.status === 'approved' ? 
                  '<span class="status-confirmed">✓ 참가확정</span>' : ''}
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error fetching event status:', error);
    alert('참가 현황을 가져오는 중 오류가 발생했습니다.');
  }
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

    // 성공적인 응답을 받은 후 UI 업데이트
    const participantRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (participantRow) {
      if (status === 'rejected') {
        // 거절된 경우 행 자체를 제거
        participantRow.style.transition = 'opacity 0.5s ease';
        participantRow.style.opacity = '0';
        
        // 애니메이션 완료 후 행 제거
        setTimeout(() => {
          participantRow.remove();
        }, 500);
        
        // 총 신청자 수 업데이트
        const paragraphs = document.querySelectorAll('#event-details p');
        const totalParticipantsEl = Array.from(paragraphs)
          .find(p => p.textContent.includes('총 신청자'));
        
        if (totalParticipantsEl) {
          const currentTotal = parseInt(totalParticipantsEl.textContent.match(/(\d+)명/)[1]);
          totalParticipantsEl.innerHTML = `<strong>총 신청자:</strong> ${currentTotal - 1}명`;
        }
      } else if (status === 'approved') {
        // 승인된 경우 UI 업데이트
        const statusCell = participantRow.querySelector('td:nth-child(5)');
        const actionsCell = participantRow.querySelector('td:last-child');
        
        statusCell.innerHTML = formatStatus(status);
        actionsCell.innerHTML = '<span class="status-confirmed">✓ 참가확정</span>';
        
        // 승인된 참가자 수 업데이트
        const paragraphs = document.querySelectorAll('#event-details p');
        const approvedCountEl = Array.from(paragraphs)
          .find(p => p.textContent.includes('승인된 참가자'));
        
        if (approvedCountEl) {
          const matches = approvedCountEl.textContent.match(/(\d+)\/(\d+)명/);
          if (matches) {
            const currentCount = parseInt(matches[1]);
            const maxCount = parseInt(matches[2]);
            approvedCountEl.innerHTML = `<strong>승인된 참가자:</strong> ${currentCount + 1}/${maxCount}명`;
          }
        }

        // 시각적 피드백 추가
        participantRow.classList.add('status-approved');
      }
    }

    alert(status === 'approved' ? '참가자가 승인되었습니다.' : '참가 신청이 거절되었습니다.');

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
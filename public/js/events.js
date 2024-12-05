// public/js/events.js
let userId;
async function fetchUserId() {
  try {
    const response = await fetch('/user/info');
    const userData = await response.json();
    userId = userData.id || userData._id; // Adjust as necessary based on the API response
 // Store the user ID
  } catch (error) {
    console.error('Error fetching user ID:', error);
  }
}

async function checkUserRole() {
  try {
    const response = await fetch('/user/user-role');
    const data = await response.json();

    const staffButton = document.getElementById('staff-button-container');
    if (!staffButton) {
      console.warn("Element 'staff-button-container' not found");
      return;
    }
    if (data.role === 'staff') {
      staffButton.style.display = 'block';
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
  }
}

async function fetchEvents() {
  try {
    const response = await fetch('/events');
    const events = await response.json();

    const eventsList = document.getElementById('events-list');
    if (!eventsList) {
      console.warn("Element with id 'events-list' not found.");
      return;
    }

    eventsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>주제</th>
            <th>날짜</th>
            <th>장소</th>
            <th>참가 현황</th>
            <th>시간</th>
            <th>참가비</th>
            <th>신청</th>
            <th>내용</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    const tableBody = eventsList.querySelector('tbody');

    if (events.length === 0) {
      eventsList.innerHTML += '<p>현재 진행중인 이벤트가 없습니다.</p>';
      return;
    }

    // 현재 사용자 정보 가져오기
    const userResponse = await fetch('/user/info');
    const currentUser = await userResponse.json();

    events.forEach(event => {
      const isFull = event.appliedParticipants.length >= event.participants;
      const hasApplied = event.appliedParticipants.includes(currentUser.id);
      const isActive = currentUser.active;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${event.title}</td>
        <td>${new Date(event.date).toLocaleDateString()}</td>
        <td>${event.place}</td>
        <td>${event.appliedParticipants.length} / ${event.participants}</td>
        <td>${event.startTime}~${event.endTime}</td>
        <td>${event.participation_fee.toLocaleString()}원</td>
        <td>
          ${
            hasApplied
              ? `<button onclick="cancelApplication('${event._id}')">신청취소</button>` // 이미 신청한 경우
              : isFull
                ? '<button disabled>마감</button>' // 마감된 경우
                : isActive
                  ? `<button onclick="applyForEvent('${event._id}')">신청하기</button>` // active=true인 경우 신청 버튼
                  : '<button disabled>신청불가</button>' // active=false인 경우
          }
        </td>
        <td><a href="#" onclick="openContentWindow('${event._id}')">
        <img src ="/images/info-check.png" alt="Check Event" style =" cursor: pointer; width: 100px;">
        </a></td>
        <td>
          <img src="/images/event-cancel-icon.png" 
               alt="Cancel Event" 
               style="cursor: pointer; width: 30px;" 
               onclick="handleCancelEvent('${event._id}', '${event.creator}')">
        </td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}





// 새로운 이벤트 등록
async function submitEvent() {
  const title = document.getElementById('event-title').value;
  const place = document.getElementById('event-place').value;
  const participants = parseInt(document.getElementById('event-participants').value, 10);
  const date = document.getElementById('event-date').value;
  const startTime = document.getElementById('event-start-time').value;
  const endTime = document.getElementById('event-end-time').value;
  const participation_fee = document.getElementById('event-participation-fee').value;
  const contents = document.getElementById('event-contents').value;

  try {
    const response = await fetch('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        place,
        participants,
        date,
        startTime,
        endTime,
        participation_fee,
        contents
      })
    });

    if (response.ok) {
      alert('이벤트가 등록되었습니다');
      window.location.href = 'events.html'; // Redirect to events page after submission
    } else {
      console.error('Error:', await response.json());
      alert("입력란을 모두 입력해주세요.");
    }
  } catch (error) {
    console.error('Error submitting event:', error);
    
  }
}


// Redirect to additional-info.html with event ID in query string
async function openContentWindow(eventId) {
  try {
    window.location.href = `additional-info.html?id=${eventId}`;
  } catch (error) {
    console.error('Error opening event content window:', error);
  }
}


async function loadReportFormOptions() {
  try {
    const response = await fetch('/events');
    const events = await response.json();

    const eventDropdown = document.getElementById('report-event');
    if (!eventDropdown) {
      console.error("Dropdown element with ID 'report-event' not found.");
      return;
    }

    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event._id;
      option.textContent = event.title;
      eventDropdown.appendChild(option);
    });

    const participantsResponse = await fetch('/user/participants/users');
    const participants = await participantsResponse.json();

    const participantList = document.getElementById('participant-list');
    if (!participantList) {
      console.error("Element with ID 'participant-list' not found.");
      return;
    }

    participantList.innerHTML = ''; // Clear existing options
    participants.forEach(participant => {
      const div = document.createElement('div');
      div.className = 'participant-item'; // Assign class for CSS styling

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = participant.id; // Set value to participant ID
      checkbox.id = `participant-${participant.id}`;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = participant.displayName;

      div.appendChild(checkbox);
      div.appendChild(label);

      participantList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading report form options:', error);
  }
}


// 결과 보고서 제출
async function submitReport() {
  const eventDropdown = document.getElementById('report-event');
  const selectedEventId = eventDropdown ? eventDropdown.value : null;

  const selectedWeekInput = document.querySelector('input[name="week"]:checked');
  const selectedWeek = selectedWeekInput ? selectedWeekInput.value : null;

  const selectedParticipants = Array.from(document.querySelectorAll('#participant-list input:checked'))
    .map(checkbox => checkbox.value);

  // 값이 모두 올바르게 선택되었는지 확인
  if (!selectedEventId) {
    alert('이벤트를 선택하세요.');
    return;
  }

  if (!selectedWeek) {
    alert('주차를 선택하세요.');
    return;
  }

  if (selectedParticipants.length === 0) {
    alert('최소 한 명의 참가자를 선택하세요.');
    return;
  }

  try {
    const response = await fetch(`/events/${selectedEventId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week: selectedWeek,
        participants: selectedParticipants
      })
    });

    if (response.ok) {
      alert('보고서 제출 완료!');
      await markEventAsEnded(selectedEventId); // 이벤트 종료
      fetchEvents(); // 이벤트 목록 갱신
      window.location.href="events.html";
    } else {
      const errorData = await response.json();
      console.error('Failed to submit report:', errorData);
      alert('보고서 제출에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    alert('보고서를 제출하는 중 오류가 발생했습니다.');
  }
}



// 이벤트 종료 표시
async function markEventAsEnded(eventId) {
  try {
    const response = await fetch(`/events/${eventId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to mark event as ended');
    }

    console.log(`Event ${eventId} marked as ended`);
  } catch (error) {
    console.error('Error marking event as ended:', error);
  }
}

// 이벤트 삭제
async function cancelEvent(eventId) {
  // 사용자에게 삭제 확인 메시지 표시
  const isConfirmed = confirm('정말로 이벤트를 삭제하시겠습니까?');

  if (!isConfirmed) {
    // 사용자가 취소를 선택한 경우
    alert('이벤트 삭제가 취소되었습니다.');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      alert('이벤트가 취소되었습니다.');
      fetchEvents(); // Refresh the event list after cancellation
    } else {
      const errorData = await response.json();
      console.error('Failed to cancel event:', errorData.message);
      alert('이벤트를 취소할 수 없습니다: ' + errorData.message);
    }
  } catch (error) {
    console.error('Error canceling event:', error);
  }
}

// 이벤트 취소 핸들링
async function handleCancelEvent(eventId, eventCreator) {
  try {
    // Fetch user role to confirm the user is a staff member
    const response = await fetch('/user/user-role');
    const data = await response.json();
    const userRole = data.role; // 역할 가져오기

    if (eventCreator === userId && userRole === 'staff') {
      // 사용자가 이벤트 생성자이면서 staff인 경우
      await cancelEvent(eventId);
    } else if (userRole !== 'staff') {
      alert('이벤트를 취소할 권한이 없습니다. (권한: 일반 사용자)');
    } else {
      alert('이벤트 생성자가 아니므로 취소할 수 없습니다.');
    }
  } catch (error) {
    console.error('Error checking role or canceling event:', error);
  }
}

async function loadEventDetails(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    const isApplied = event.appliedParticipants.includes(currentUserId);
    const button = document.getElementById('apply-button');

    if (isApplied) {
      button.textContent = '신청 취소';
      button.onclick = () => cancelApplication(eventId);
    } else {
      button.textContent = '신청하기';
      button.onclick = () => applyForEvent(eventId);
    }

    document.getElementById('event-details').innerHTML = `
      <p>제목: ${event.title}</p>
      <p>장소: ${event.place}</p>
      <p>날짜: ${new Date(event.date).toLocaleDateString()}</p>
      <p>내용: ${event.contents}</p>
      <p>참가 현황: ${event.appliedParticipants.length} / ${event.participants}</p>
    `;
  } catch (error) {
    console.error('Error loading event details:', error);
    alert('이벤트 정보를 불러오는 중 문제가 발생했습니다.');
  }
}

async function applyForEvent(eventId) {
  const isConfirmed = confirm('이벤트 당일 일주일 전부터 신청취소 시 경고1회가 주어집니다. 신청하시겠습니까?');

  if (!isConfirmed) {
    // 사용자가 취소를 선택한 경우
    alert('신청이 취소되었습니다.');
    return;
  }
  try {


    const response = await fetch(`/events/${eventId}/apply`, { method: 'POST' });

    if (response.ok) {
      alert('신청이 완료되었습니다.');
      fetchEvents(); // 이벤트 목록 다시 로드
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
  try {
    const response = await fetch(`/events/${eventId}/cancel-application`, { method: 'POST' });

    if (response.ok) {
      alert('신청이 취소되었습니다.');
      fetchEvents(); // 이벤트 목록 다시 로드
    } else {
      const error = await response.json();
      alert(`취소 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('Error canceling application:', error);
    alert('취소 중 문제가 발생했습니다.');
  }
}


// 참가상태 리디렉션
function checkParticipationStatus() {
  window.location.href = '/participation-status.html';
}






// Run fetchEvents when the document is ready
document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserId(); 
  await fetchEvents();
  checkUserRole();
});
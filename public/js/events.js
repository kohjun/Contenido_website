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
            <th>참가 인원</th>
            <th>시작 시간</th>
            <th>종료 시간</th>
            <th>참가비</th>
            <th>내용</th>
            <th>취소</th>
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

    events.forEach(event => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${event.title}</td>
        <td>${new Date(event.date).toLocaleDateString()}</td>
        <td>${event.place}</td>
        <td>${event.participants  }명</td>
        <td>${event.startTime}</td>
        <td>${event.endTime}</td>
        <td>${event.participation_fee.toLocaleString()}원</td>
        <td><a href="#" onclick="openContentWindow('${event._id}')"><strong>보기</strong></a></td>
        <td>
          <img src="/images/event-cancel-icon.png" 
               alt="Cancel Event" 
               style="cursor: pointer; width: 16px;" 
               onclick="handleCancelEvent('${event._id}', '${event.creator}')">
        </td>
      `;

      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error fetching events:', error);
  }
}





// Function to submit a new event
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

// Fetch events for the dropdown in the report form
async function loadReportFormOptions() {
  try {
    const response = await fetch('/events');
    const events = await response.json();

    const eventDropdown = document.getElementById('report-event');
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event._id;
      option.textContent = event.title;
      eventDropdown.appendChild(option);
    });

    // Fetch participants for checkboxes
    const participantsResponse = await fetch('/user/participants/users');
    const participants = await participantsResponse.json();
    const participantList = document.getElementById('participant-list');

    participantList.innerHTML = ''; // Clear existing options
    participants.forEach(participant => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = participant.id; // Set value to participant ID
      checkbox.id = `participant-${participant.id}`;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = participant.displayName;

      const div = document.createElement('div');
      div.appendChild(checkbox);
      div.appendChild(label);

      participantList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading report form options:', error);
  }
}


// Submit the report to update the participation status
async function submitReport() {
  const eventId = document.getElementById('report-event').value;
  const selectedWeek = document.querySelector('input[name="week"]:checked').value;
  const selectedParticipants = Array.from(document.querySelectorAll('#participant-list input:checked'))
    .map(checkbox => checkbox.value);

  if (!eventId || !selectedWeek || selectedParticipants.length === 0) {
    alert('모든 필드를 채워 주세요.');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week: selectedWeek,
        participants: selectedParticipants
      })
    });

    if (response.ok) {
      alert('보고서 제출 완료!');
      await markEventAsEnded(eventId); // 이벤트 종료
      fetchEvents(); // 이벤트 목록 갱신
    } else {
      console.error('Failed to submit report:', await response.json());
    }
  } catch (error) {
    console.error('Error submitting report:', error);
  }
}


// Mark event as ended
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

// Handle cancel event with authorization check
async function handleCancelEvent(eventId, eventCreator) {
  if (eventCreator === userId) { // eventCreator가 문자열로 전달되는지 확인
    await cancelEvent(eventId);
  } else {
    alert('이벤트를 취소할 권한이 없습니다.');
  }
}
// Redirect to participation status page
function checkParticipationStatus() {
  window.location.href = '/participation-status.html';
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


// Run fetchEvents when the document is ready
document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserId(); // Ensure userId is fetched before fetching events
 fetchEvents();
 checkUserRole();
});
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
// Fetches events from the server and displays them
async function fetchEvents() {
  try {
    const response = await fetch('/events');
    const events = await response.json();
    const eventsList = document.getElementById('events-list');

    // Clear the list in case of re-render
    eventsList.innerHTML = `
      <table>
        <tr>
          <th>주제</th>
          <th>날짜</th>
          <th>장소</th>
          <th>참가 인원</th>
          <th>시작 시간</th>
          <th>종료 시간</th>
          <th>참가비</th>
          <th>내용</th>
          <th>취소</th> <!-- Empty header for cancel button -->
        </tr>
      </table>
    `;

    const table = eventsList.querySelector('table');

    // Loop through each event and create table rows
    events.forEach(event => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${event.title}</td>
        <td>${new Date(event.date).toLocaleDateString()}</td>
        <td>${event.place}</td>
        <td>${event.participants}명</td>
        <td>${event.startTime}</td>
        <td>${event.endTime}</td>
        <td>${event.participation_fee}원</td>
        <td><a href="#" onclick="openContentWindow('${event._id}')">보기</a></td>
      `;

      // Only add the cancel button if the user is the creator
      if (event.creator === userId) { // Assume userId is the ID of the currently logged-in user
        const cancelCell = document.createElement('td');
        const cancelButton = document.createElement('img');
        cancelButton.src = '/images/event-cancel-icon.png';
        cancelButton.alt = 'Cancel Event';
        cancelButton.style.cursor = 'pointer';
        cancelButton.width="10";
        
        cancelButton.onclick = () => cancelEvent(event._id); // Call cancelEvent with the event ID
        cancelCell.appendChild(cancelButton);
        row.appendChild(cancelCell);
      } else {
        row.appendChild(document.createElement('td')); // Empty cell for non-creators
      }

      table.appendChild(row);
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
      body: JSON.stringify({ title, place, participants, date, startTime, endTime, participation_fee, contents })
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

// Function to open a new window with the event contents
async function openContentWindow(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    // Open a new window and write the contents
    const contentWindow = window.open('', '_blank', 'width=600,height=400');
    contentWindow.document.write(`
      <html>
      <head>
        <title>${event.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { font-size: 1.5em; }
          p { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${event.title}</h1>
        <p><strong>날짜:</strong> ${new Date(event.date).toLocaleDateString()}</p>
        <p><strong>장소:</strong> ${event.place}</p>
        <p><strong>참가 인원:</strong> ${event.participants}</p>
        <p><strong>시작 시간:</strong> ${event.startTime}</p>
        <p><strong>종료 시간:</strong> ${event.endTime}</p>
        <p><strong>참가비:</strong> ${event.participation_fee}</p>
        <hr>
        <p>${event.contents}</p>
      </body>
      </html>
    `);
    contentWindow.document.close(); // Close the document to finish writing
  } catch (error) {
    console.error('Error fetching event contents:', error);
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
      // Reload participation status to show updates
      fetchUserStatus(); // Refreshes the participant table with updated data
    } else {
      console.error('Failed to submit report:', await response.json());
    }
  } catch (error) {
    console.error('Error submitting report:', error);
  }
}

// 이벤트 삭제
async function cancelEvent(eventId) {
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
// Redirect to participation status page
function checkParticipationStatus() {
  window.location.href = '/participation-status.html';
}

// Run fetchEvents when the document is ready
document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserId(); // Fetch user ID before loading events
  fetchEvents(); // Then load events
});
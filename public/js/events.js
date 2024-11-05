// public/js/events.js

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
        <td><a href="#" onclick="openContentWindow('${event._id}')">보기</a></td> <!-- '보기' link -->
      `;
      table.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}


// Function to submit a new event
async function submitEvent() {
  const title = document.getElementById('event-title').value;
  const date = document.getElementById('event-date').value;
  const place = document.getElementById('event-place').value;
  const participants = parseInt(document.getElementById('event-participants').value, 10);
  const startTime = document.getElementById('event-start-time').value;
  const endTime = document.getElementById('event-end-time').value;
  const participation_fee = document.getElementById('event-participation-fee').value;
  const contents = document.getElementById('event-contents').value; // Ensure correct ID is used

  try {
    const response = await fetch('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, place, participants, startTime, endTime, participation_fee, contents })
    });

    if (response.ok) {
      alert('Event submitted!');
      document.getElementById('event-form').style.display = 'none';
      fetchEvents(); // Reload events after posting
    } else {
      console.error('Failed to submit event:', await response.json());
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

// Redirect to participation status page
function checkParticipationStatus() {
  window.location.href = '/participation-status.html';
}

// Run fetchEvents when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('events-list')) {
    fetchEvents();
  }
});
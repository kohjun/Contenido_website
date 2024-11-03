// public/js/events.js

// Fetches events from the server and displays them
async function fetchEvents() {
  try {
    const response = await fetch('/events');
    const events = await response.json();
    const eventsList = document.getElementById('events-list');

    // Clear the list in case of re-render
    eventsList.innerHTML = '';

    // Loop through each event and create HTML elements
    events.forEach(event => {
      const eventDiv = document.createElement('div');
      eventDiv.classList.add('event');

      eventDiv.innerHTML = `
        <h3>${event.title}</h3>
        <p>Date: ${new Date(event.date).toLocaleDateString()}</p>
        <p>Participants: ${event.participants.length}</p>
      `;

      // Append each event to the events list
      eventsList.appendChild(eventDiv);
    });
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

// Function to submit a new event
async function submitEvent() {
  const title = document.getElementById('event-title').value;
  const date = document.getElementById('event-date').value;

  try {
    await fetch('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date })
    });

    alert('Event submitted!');
    document.getElementById('event-form').style.display = 'none';
    fetchEvents(); // Reload events after posting
  } catch (error) {
    console.error('Error submitting event:', error);
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
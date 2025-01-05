//public/js/modify-event.js
let originalData = {}; // Store original content for cancellation

// Function to load event content dynamically
async function loadEventContent(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-place').textContent = event.place;
    document.getElementById('event-date').textContent = new Date(event.date).toISOString().split('T')[0];
    document.getElementById('event-participants').textContent = event.participants + '명'
    document.getElementById('event-start-time').textContent = event.startTime;
    document.getElementById('event-end-time').textContent = event.endTime;
    document.getElementById('event-fee').textContent = event.participation_fee.toLocaleString() + '원';
    document.getElementById('event-contents').textContent = event.contents;

    originalData = { ...event }; // Store original data for cancellation

    const userResponse = await fetch('/user/info');
    const user = await userResponse.json();
  

    if (event.creator === user.id&&user.role === "officer") {
      document.getElementById('modify-button').style.display = 'block';
    } else {
      document.getElementById('modify-button').style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading event content:', error);
    alert('이벤트 내용을 불러오는 중 문제가 발생했습니다.');
  }
}

// Enable editing of all event fields
function enableEdit() {

    const fields = [
      { id: 'event-title', type: 'text', key: 'title' },
      { id: 'event-place', type: 'text', key: 'place' },
      { id: 'event-date', type: 'date', key: 'date' },
      { id: 'event-participants', type: 'number', key: 'participants' },
      { id: 'event-start-time', type: 'time', key: 'startTime' },
      { id: 'event-end-time', type: 'time', key: 'endTime' },
      { id: 'event-fee', type: 'number', key: 'participation_fee' }, 
      { id: 'event-contents', type: 'textarea', key: 'contents' }
    ];
  
    fields.forEach(field => {
      const span = document.getElementById(field.id);
      const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
  
      input.id = `edit-${field.id}`;
      input.type = field.type;
  
      // 숫자 필드는 숫자만 남기도록 처리
      if (field.type === 'number') {
        input.value = span.textContent.replace(/[^\d]/g, ''); // 숫자 이외의 모든 문자를 제거
      } else {
        input.value = span.textContent;
      }
  
      span.replaceWith(input);
    });
  
    document.getElementById('modify-button').style.display = 'none';
    document.getElementById('confirmation-buttons').style.display = 'block';
  }
  
  

// Submit edited event data
async function submitEdit() {
    const eventId = new URLSearchParams(window.location.search).get('id');
  
    const updatedData = {
      title: document.getElementById('edit-event-title').value,
      place: document.getElementById('edit-event-place').value,
      date: document.getElementById('edit-event-date').value,
      participants: parseInt(document.getElementById('edit-event-participants').value, 10), // 정수로 변환
      startTime: document.getElementById('edit-event-start-time').value,
      endTime: document.getElementById('edit-event-end-time').value,
      participation_fee: parseInt(document.getElementById('edit-event-fee').value, 10), // 정수로 변환
      contents: document.getElementById('edit-event-contents').value
    };
  
    console.log('Updated Data:', updatedData); // 디버깅: 전송 데이터 확인
  
    try {
      const response = await fetch(`/events/update-content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...updatedData }) 
      });
  
      if (response.ok) {
        alert('이벤트 내용이 성공적으로 수정되었습니다.');
        location.reload();
      } else {
        const errorData = await response.json();
        alert(`수정 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error submitting edited content:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  }
  
  


// Cancel editing and restore original content
function cancelEdit() {
  location.reload(); // Reload page to restore original content
}

// Load event data on page load
document.addEventListener('DOMContentLoaded', () => {
  const eventId = new URLSearchParams(window.location.search).get('id');
  if (eventId) {
    loadEventContent(eventId);
  } else {
    alert('이벤트 ID가 없습니다.');
  }
});
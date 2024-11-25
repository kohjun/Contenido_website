// Fetch event participant status and render it on the page
async function fetchEventStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  if (!eventId) {
    alert('이벤트 ID가 없습니다.');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/participants`);
    const data = await response.json();

    document.getElementById('event-details').innerHTML = `
      <p><strong>제목:</strong> ${data.title}</p>
      <p><strong>날짜:</strong> ${new Date(data.date).toLocaleDateString()}</p>
      <p><strong>참가 인원:</strong> ${data.participants.length}</p>
    `;

    const participantList = document.getElementById('participant-list');
    participantList.innerHTML = data.participants
      .map(participant => 
      {
        const genderDisplay = participant.gender === 'male' 
        ? '남' 
        : participant.gender === 'female' 
        ? '여' 
        : '그외';
        
        return `
        <tr>
          <td>${participant.name}</td>
          <td>${genderDisplay}</td>
          <td>참가 확정</td>
        </tr>
      `})
      .join('');
  } catch (error) {
    console.error('Error fetching event status:', error);
    alert('참가 현황을 가져오는 중 오류가 발생했습니다.');
  }
}


  
  // Initialize event status page
  document.addEventListener('DOMContentLoaded', fetchEventStatus);
  
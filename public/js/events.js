// public/js/events.js
let userId;
let currentPage = 1;
let eventsPerPage = 10;
let allEvents = [];

async function fetchEvents() {
  try {
    const response = await fetch('/events');
    const events = await response.json();
    allEvents = events; // 모든 이벤트 저장

    const userResponse = await fetch('/user/info');
    const currentUser = await userResponse.json();

    displayCurrentPage(currentUser);

  } catch (error) {
    console.error('Error fetching events:', error);
    const eventsList = document.getElementById('events-list');
    if (eventsList) {
      eventsList.innerHTML = `
        <div class="error-state">
          <p>이벤트를 불러오는 중 문제가 발생했습니다.</p>
          <p>로그인 후 다시 시도해주세요.</p>
        </div>
      `;
    }
  }
}

function displayCurrentPage(currentUser) {
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = allEvents.slice(startIndex, endIndex);
  
  const eventsList = document.getElementById('events-list');
  if (!eventsList) {
    console.warn("Element with id 'events-list' not found.");
    return;
  }

  if (allEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <p>현재 진행중인 이벤트가 없습니다.</p>
      </div>
    `;
    return;
  }

  eventsList.innerHTML = '<div class="events-grid"></div>';
  const eventsGrid = eventsList.querySelector('.events-grid');

  // 기존의 이벤트 카드 생성 로직
  currentEvents.forEach(event => {
    const hasApplied = event.appliedParticipants.some(p => p.userId.toString() === currentUser.id);
    const approvedCount = event.appliedParticipants.filter(p => p.status === 'approved').length;
    const isFull = approvedCount >= event.participants;
    const isActive = currentUser.active;
    const userStatus = hasApplied ? 
      event.appliedParticipants.find(p => p.userId.toString() === currentUser.id)?.status : null;
    
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    
    let statusBadge = '';
    if (isFull) {
      statusBadge = '<span class="status-badge full">마감</span>';
    } else if (hasApplied) {
      statusBadge = userStatus === 'approved' ? 
        '<span class="status-badge approved">참가확정</span>' : 
        '<span class="status-badge pending">승인대기</span>';
    }

    // 신청 버튼 상태 결정
    let applyButton = '';
    if (hasApplied) {
      applyButton = `<button class="action-button cancel-button" onclick="cancelApplication('${event._id}')">신청취소</button>`;
    } else if (isFull) {
      applyButton = '<button class="action-button apply-button" disabled>승인마감</button>';
    } else if (!isActive) {
      applyButton = '<button class="action-button apply-button" disabled>신청불가</button>';
    } else {
      if (event.isSelective && event.additionalQuestions?.length > 0) {
        applyButton = '<button class="action-button apply-button" disabled>상세보기 신청</button>';
      } else {
        applyButton = `<button class="action-button apply-button" onclick="applyForEvent('${event._id}')">신청하기</button>`;
      }
    }

    eventCard.innerHTML = `
      <div class="event-image">
        ${statusBadge}
        ${event.images && event.images.length > 0 
          ? `<img src="${event.images[0]}" alt="${event.title}">` 
          : `<img src="./images/Basic_Event_Image.png" alt="기본 이벤트 이미지">`
        }
      </div>
      <div class="event-content">
        <div class="event-header">
          <h3 class="event-title">${event.title}</h3>
          <span class="event-team">${event.team}</span>
          ${event.isSelective ? '<span class="selective-badge">📝 지원서 필요</span>' : ''}
        </div>
        
        <div class="event-info">
          <div class="info-row">
            <div class="info-item">
              <span class="info-icon"><img src="./images/EventDate.jpeg"></span>
              <span>${new Date(event.date).toLocaleDateString()}</span>
            </div>
            <div class="info-item">
              <span class="info-icon"><img src="./images/ProgressTime.jpeg"></span>
              <span>${event.startTime} ~ ${event.endTime}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="info-icon"><img src="./images/EventLocation.jpeg"></span>
            <span>${event.place}</span>
          </div>
          <div class="info-row">
            <div class="info-item">
              <span class="info-icon"><img src="./images/participants.jpeg"></span>
              <span>${approvedCount}/${event.participants}명</span>
            </div>
            <div class="info-item">
              <span class="info-icon"><img src="./images/participation_fee.jpeg"></span>
              <span>${event.participation_fee.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div class="event-actions">
          <button class="action-button view-details" onclick="openContentWindow('${event._id}')">
            상세보기
          </button>
          ${applyButton}
          ${(currentUser.role === 'admin' || (currentUser.role === 'officer' && event.creator === currentUser.id))
            ? `<button class="action-button delete-button" onclick="handleCancelEvent('${event._id}', '${event.creator}')">
                삭제
              </button>`
            : ''}
        </div>
      </div>
    `;

    eventsGrid.appendChild(eventCard);
  });

  // 페이지네이션 컨트롤 업데이트
  updatePaginationControls();
}

function updatePaginationControls() {
  const totalPages = Math.ceil(allEvents.length / eventsPerPage);
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
  pageInfo.textContent = `페이지 ${currentPage} / ${totalPages}`;
}

// 페이지네이션 버튼 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
  fetchEvents();

  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchEvents();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(allEvents.length / eventsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      fetchEvents();
    }
  });
});

// 새로운 이벤트 등록
async function submitEvent() {
  try {
    const title = document.getElementById('event-title').value;
    const place = document.getElementById('event-place').value;
    const participants = document.getElementById('event-participants').value;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const participation_fee = document.getElementById('event-participation-fee').value;
    const contents = document.getElementById('event-contents').value;
    const team = document.getElementById('event-team').value;
    const accessCode = document.getElementById('event-access-code').value;
    const isSelective = document.getElementById('is-selective').checked;
    

    
    // 입력값 검증
    if (!title || !place || !participants || !date || !startTime || 
        !endTime || !participation_fee || !contents || !team || !accessCode) {
      alert('모든 필수 필드를 입력해주세요.');
      return;
    }

    // 접근 코드 유효성 검사
    if (!/^\d{4}$/.test(accessCode)) {
      alert('접근 코드는 4자리 숫자여야 합니다.');
      return;
    }

    // 접근 코드 확인 메시지
    const confirmed = confirm(
      `이벤트의 접근 코드는 "${accessCode}" 입니다.\n` +
      '이 코드는 저장 후 다시 확인할 수 없으니 반드시 기억해두세요.\n' +
      '계속 진행하시겠습니까?'
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('place', place);
    formData.append('participants', participants);
    formData.append('date', date);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('participation_fee', participation_fee);
    formData.append('contents', contents);
    formData.append('team', team);
    formData.append('accessCode', accessCode);
    formData.append('isSelective', isSelective);
    if (isSelective) {
      const questions = Array.from(document.querySelectorAll('.question-item')).map(item => ({
        questionText: item.querySelector('.question-text').value
      }));

      if (questions.length === 0) {
        alert('선별적 이벤트에는 최소 1개의 질문이 필요합니다.');
        return;
      }

      if (questions.some(q => !q.questionText.trim())) {
        alert('모든 질문을 입력해주세요.');
        return;
      }

      formData.append('additionalQuestions', JSON.stringify(questions));
    }

    // 이미지 파일이 있는 경우 추가
    const images = document.getElementById('event-images')?.files || [];
    Array.from(images).forEach(image => {
      formData.append('images', image);
    });

    const response = await fetch('/events', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '서버 에러가 발생했습니다.');
    }

    // 성공 시 접근 코드 다시 한 번 보여주기
    alert(
      `이벤트가 성공적으로 등록되었습니다.\n\n` +
      `이벤트 접근 코드: ${accessCode}\n` +
      `이 코드를 반드시 기억해두세요!`
    );
    
    window.location.href = 'events.html';
  } catch (error) {
    console.error('Error submitting event:', error);
    alert(error.message || '이벤트 등록 중 오류가 발생했습니다.');
  }
}

let questionCount = 0;

function toggleQuestionSection() {
  const isSelective = document.getElementById('is-selective').checked;
  const questionSection = document.getElementById('question-section');
  questionSection.style.display = isSelective ? 'block' : 'none';

  if (!isSelective) {
    document.getElementById('questions-container').innerHTML = '';
    questionCount = 0;
  }
}

function addQuestion() {
  if (questionCount >= 5) {
    alert('최대 5개의 질문만 추가할 수 있습니다.');
    return;
  }

  const container = document.getElementById('questions-container');
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question-item';
  questionDiv.innerHTML = `
    <button type="button" class="delete-question" onclick="deleteQuestion(this)">×</button>
    <div class="form-group">
      <label>질문 ${questionCount + 1}</label>
      <textarea class="question-text" 
                placeholder="질문을 입력하세요" 
                required></textarea>
    </div>
  `;

  container.appendChild(questionDiv);
  questionCount++;

  document.getElementById('add-question-btn').disabled = questionCount >= 5;
}

function deleteQuestion(button) {
  button.closest('.question-item').remove();
  questionCount--;
  
  document.querySelectorAll('.question-item').forEach((item, index) => {
    const label = item.querySelector('label');
    if (label) {
      label.textContent = `질문 ${index + 1}`;
    }
  });

  document.getElementById('add-question-btn').disabled = false;
}
// Redirect to additional-info.html with event ID in query string
async function openContentWindow(eventId) {
  try {
    window.location.href = `additional-info.html?id=${eventId}`;
  } catch (error) {
    console.error('Error opening event content window:', error);
  }
}


// 참가자 보고서 제출 옵션
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
    
    // active가 true인 유저만 필터링하고 이름+전화번호 형식으로 표시
    const activeParticipants = participants.filter(participant => participant.active);
    
    activeParticipants.forEach(participant => {
      const div = document.createElement('div');
      div.className = 'participant-item';
      
      // 전화번호 뒷 4자리 추출
      const phoneLastFour = participant.phonenumber ? participant.phonenumber.slice(-4) : '';
      const displayText = `${participant.name}${phoneLastFour}`;
      
      div.setAttribute('data-name', displayText.toLowerCase());
      div.setAttribute('data-display', displayText); // 표시용 텍스트 저장

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = participant.id;
      checkbox.id = `participant-${participant.id}`;
      checkbox.setAttribute('data-display', displayText); // 체크박스에도 표시용 텍스트 저장

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = displayText; // 이름+전화번호 뒷자리 표시

      div.appendChild(checkbox);
      div.appendChild(label);

      participantList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading report form options:', error);
  }
}

function searchParticipant(searchText) {
  if (!searchText.trim()) {
    alert('검색어를 입력해주세요.');
    return;
  }

  const participantList = document.getElementById('participant-list');
  const items = participantList.getElementsByClassName('participant-item');
  searchText = searchText.toLowerCase();

  let found = false;
  for (const item of items) {
    const name = item.getAttribute('data-name');
    if (name.includes(searchText)) {
      // 검색된 참가자로 스크롤
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 검색된 항목 강조 표시
      item.style.backgroundColor = '#fff3cd';
      // 1초 후 강조 표시 제거
      setTimeout(() => {
        item.style.backgroundColor = '';
      }, 1000);
      found = true;
      break;
    }
  }

  if (!found) {
    alert('검색 결과가 없습니다.');
  }
}

// 결과 보고서 제출
async function submitReport() {
  try {
    const eventDropdown = document.getElementById('report-event');
    const selectedEventId = eventDropdown ? eventDropdown.value : null;
    const accessCode = document.getElementById('report-access-code').value;

    const selectedParticipants = Array.from(document.querySelectorAll('#participant-list input:checked'))
      .map(checkbox => ({
        id: checkbox.value,
        displayName: checkbox.getAttribute('data-display')
      }));

    if (!selectedEventId) {
      alert('이벤트를 선택하세요.');
      return;
    }

    if (!accessCode) {
      alert('접근 코드를 입력하세요.');
      return;
    }

    if (selectedParticipants.length === 0) {
      alert('최소 한 명의 참가자를 선택하세요.');
      return;
    }

    // 접근 코드 확인
    const verifyResponse = await fetch(`/events/${selectedEventId}/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode })
    });

    if (!verifyResponse.ok) {
      alert('잘못된 접근 코드입니다.');
      return;
    }

    // 보고서 제출
    const response = await fetch(`/events/${selectedEventId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants: selectedParticipants.map(p => p.id) // 서버에는 ID만 전송
      })
    });

    if (response.ok) {
      alert('보고서 제출 완료!');
      await markEventAsEnded(selectedEventId);
      fetchEvents();
      window.location.href = "events.html";
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
  const isConfirmed = confirm('해당 이벤트를 삭제하시겠습니까?');

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
    const userResponse = await fetch('/user/info');
    const currentUser = await userResponse.json();

    if (currentUser.role === 'admin' || (currentUser.role === 'officer' && eventCreator === currentUser.id)) {
      // 관리자이거나 이벤트 생성자인 officer인 경우
      const isConfirmed = confirm('이벤트를 삭제하시겠습니까?');
      if (isConfirmed) {
        await cancelEvent(eventId);
      }
    } else {
      alert('이벤트를 삭제할 권한이 없습니다.');
    }
  } catch (error) {
    console.error('Error checking role or canceling event:', error);
    alert('이벤트 삭제 중 오류가 발생했습니다.');
  }
}
function viewEventStatus() {
  const selectedEventId = document.getElementById('report-event').value;
  if (!selectedEventId) {
    alert('이벤트를 선택하세요.');
    return;
  }
  window.location.href = `event-status-staff.html?id=${selectedEventId}`;
}

// 이벤트 현황 확인으로 리디렉션
function checkParticipationStatus() {
  window.location.href = 'participation-status.html';
}
async function cancelEvent(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      alert('이벤트가 성공적으로 삭제되었습니다.');
      fetchEvents(); // Refresh the event list after deletion
    } else {
      const errorData = await response.json();
      console.error('Failed to delete event:', errorData.message);
      alert('이벤트 삭제에 실패했습니다: ' + errorData.message);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('이벤트 삭제 중 오류가 발생했습니다.');
  }
}

async function applyForEvent(eventId) {
  const isConfirmed = confirm('이벤트 당일 일주일 전부터 신청취소 시 경고1회가 주어집니다. 신청하시겠습니까?');

  if (!isConfirmed) {
    alert('신청이 취소되었습니다.');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/apply`, { method: 'POST' });

    if (response.ok) {
      alert('신청이 완료되었습니다. 운영진의 승인을 기다려주세요.');
      fetchEvents();
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
  const isConfirmed = confirm('정말로 신청을 취소하시겠습니까?\n이벤트 일주일 전 취소 시 경고 1회가 부여됩니다.');

  if (!isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/cancel-application`, { method: 'POST' });
    const result = await response.json();

    alert(result.message);
    fetchEvents(); // 이벤트 목록 새로고침

  } catch (error) {
    console.error('Error canceling application:', error);
    alert('신청 취소 중 문제가 발생했습니다.');
  }
}

// Run fetchEvents when the document is ready
document.addEventListener('DOMContentLoaded', async () => {
  await fetchEvents();
});

let selectedParticipants = new Set();

function updateSelectedParticipantsPreview() {
  const previewContainer = document.getElementById('selected-participants-preview');
  if (!previewContainer) return;

  const participantElements = Array.from(selectedParticipants).map(participantId => {
    const checkbox = document.querySelector(`input[value="${participantId}"]`);
    const displayName = checkbox?.getAttribute('data-display') || '';
    return `
      <div class="selected-participant" onclick="removeParticipant('${participantId}')">
        <span>${displayName}</span>
      </div>
    `;
  });

  previewContainer.innerHTML = participantElements.length ? 
    participantElements.join('') : 
    '<p>선택된 참가자가 없습니다</p>';

  const countElement = document.getElementById('selected-count');
  if (countElement) {
    countElement.textContent = selectedParticipants.size;
  }
}

function removeParticipant(participantId) {
  const checkbox = document.querySelector(`input[value="${participantId}"]`);
  if (checkbox) {
    checkbox.checked = false;
  }
  selectedParticipants.delete(participantId);
  updateSelectedParticipantsPreview();
}

async function loadApprovedParticipants() {
  try {
    const eventId = document.getElementById('report-event').value;
    if (!eventId) {
      alert('이벤트를 선택해주세요.');
      return;
    }

    const response = await fetch(`/events/${eventId}/approved-participants`);
    if (!response.ok) throw new Error('승인된 참가자 목록을 불러올 수 없습니다.');

    const approvedParticipants = await response.json();
    
    // 기존 체크박스 모두 해제
    document.querySelectorAll('#participant-list input[type="checkbox"]')
      .forEach(checkbox => {
        checkbox.checked = false;
      });

    // 승인된 참가자의 체크박스만 체크
    approvedParticipants.forEach(participant => {
      const checkbox = document.querySelector(`#participant-list input[value="${participant.id}"]`);
      if (checkbox) {
        checkbox.checked = true;
        selectedParticipants.add(participant.id);
      }
    });

    // 선택된 참가자 미리보기 업데이트
    updateSelectedParticipantsPreview();
    updateSelectedCount();

  } catch (error) {
    console.error('Error loading approved participants:', error);
    alert('승인된 참가자 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

function handleParticipantSelection(checkbox) {
  if (checkbox.checked) {
    selectedParticipants.add(checkbox.value);
  } else {
    selectedParticipants.delete(checkbox.value);
  }
  updateSelectedParticipantsPreview();
  updateSelectedCount();
}

function filterParticipants() {
  const searchInput = document.getElementById('search-input');
  const filter = searchInput.value.toLowerCase();
  const participantCards = document.querySelectorAll('.participant-card');

  participantCards.forEach(card => {
    const name = card.querySelector('.participant-name').textContent.toLowerCase();
    const phone = card.querySelector('.participant-phone')?.textContent.toLowerCase() || '';
    
    if (name.includes(filter) || phone.includes(filter)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function formatPhoneNumber(phone) {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

// 체크박스 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
  const participantList = document.getElementById('participant-list');
  if (participantList) {
    participantList.addEventListener('change', function(e) {
      if (e.target.type === 'checkbox') {
        if (e.target.checked) {
          selectedParticipants.add(e.target.value);
        } else {
          selectedParticipants.delete(e.target.value);
        }
        updateSelectedParticipantsPreview();
      }
    });
  }
});
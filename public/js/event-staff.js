// public/js/event-staff.js
// 기획부 - 이벤트 관리 페이지(event-staff.html) 전용 스크립트
// (이전에는 events.js와 한 파일에 섞여 있었음)

/* =========================================================================
   1) 이벤트 등록 폼
   ========================================================================= */

// 두 입력(date + time)을 ISO datetime으로 결합. 둘 중 하나라도 비어있으면 null 반환.
function combineDateTime(dateId, timeId) {
  const d = document.getElementById(dateId)?.value;
  const t = document.getElementById(timeId)?.value;
  if (!d || !t) return null;
  // 로컬 타임존 기반 — 서버에서 new Date()로 파싱
  return `${d}T${t}:00`;
}

// 선택된 태그 수집 (.tag-chip.is-active의 data-tag)
function collectTags() {
  return Array.from(document.querySelectorAll('.tag-chip.is-active'))
    .map(el => el.dataset.tag);
}

// HTTP 응답을 JSON 혹은 에러 텍스트로 처리하는 헬퍼 함수
async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  const text = await response.text();
  if (response.status === 413) {
    throw new Error('업로드한 이미지 용량이 너무 큽니다. 이미지 용량을 줄여서 다시 시도해주세요. (최대 10MB)');
  }
  throw new Error(`서버에서 오류가 발생했습니다. (상태 코드: ${response.status})`);
}

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
    const hasParticipantRules = document.getElementById('hasParticipantRules').checked;
    const refundPolicy = document.querySelector('input[name="refund-policy"]:checked').value;
    const refundCustomDescription = document.getElementById('custom-refund-description').value;

    // 새 필드
    const maxApplicants = document.getElementById('max-applicants')?.value || '';
    const feeType = (document.querySelector('input[name="fee-type"]:checked')?.value) || 'fixed';
    const participation_fee_max = document.getElementById('participation-fee-max')?.value || '';
    const applicationStartAt     = combineDateTime('application-start-date',     'application-start-time');
    const applicationDeadlineAt  = combineDateTime('application-deadline-date',  'application-deadline-time');
    const confirmationDeadlineAt = combineDateTime('confirmation-deadline-date', 'confirmation-deadline-time');
    const tags = collectTags();
    const isLightning = document.getElementById('is-lightning')?.checked || false;

    // 입력값 검증
    if (!title.trim()) {
      alert('이벤트 제목을 입력해주세요.');
      document.getElementById('event-title')?.focus();
      return;
    }
    if (!isLightning && !place.trim()) {
      alert('장소를 입력해주세요.');
      document.getElementById('event-place')?.focus();
      return;
    }
    if (!isLightning && !participants) {
      alert('참가 인원을 입력해주세요.');
      document.getElementById('event-participants')?.focus();
      return;
    }
    if (!date) {
      alert('행사 날짜를 입력해주세요.');
      document.getElementById('event-date')?.focus();
      return;
    }
    if (!startTime) {
      alert('시작 시간을 입력해주세요.');
      document.getElementById('event-start-time')?.focus();
      return;
    }
    if (!endTime) {
      alert('종료 시간을 입력해주세요.');
      document.getElementById('event-end-time')?.focus();
      return;
    }
    if (!isLightning && !confirmationDeadlineAt) {
      alert('참가자 확정 마감 시간을 입력해주세요.');
      document.getElementById('confirmation-deadline-date')?.focus();
      return;
    }
    if (!isLightning && participation_fee === '') {
      alert('참가비를 입력해주세요.');
      document.getElementById('event-participation-fee')?.focus();
      return;
    }
    if (!team) {
      alert('담당 팀을 선택해주세요.');
      document.getElementById('event-team')?.focus();
      return;
    }
    if (!contents.trim()) {
      alert('이벤트 내용을 입력해주세요.');
      document.getElementById('event-contents')?.focus();
      return;
    }
    if (!accessCode) {
      alert('접근 코드를 입력해주세요.');
      document.getElementById('event-access-code')?.focus();
      return;
    }
    if (!isLightning && refundPolicy === 'custom' && !refundCustomDescription.trim()) {
      alert('특수한 상황에 대한 환불 정책 설명을 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(accessCode)) {
      alert('접근 코드는 4자리 숫자여야 합니다.');
      return;
    }
    if (!isLightning && maxApplicants && parseInt(maxApplicants) < parseInt(participants)) {
      alert('최대 신청자수는 정원보다 작을 수 없습니다.');
      return;
    }
    if (!isLightning && feeType === 'range') {
      if (!participation_fee_max || parseInt(participation_fee_max) <= parseInt(participation_fee)) {
        alert('참가비 범위는 최대값이 최소값보다 커야 합니다.');
        return;
      }
    }

    const confirmed = confirm(
      `이벤트의 접근 코드는 "${accessCode}" 입니다.\n` +
      '이 코드는 저장 후 다시 확인할 수 없으니 반드시 기억해두세요.\n' +
      '계속 진행하시겠습니까?'
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('place', isLightning ? (place || '자율 장소') : place);
    formData.append('participants', isLightning ? (participants || 999) : participants);
    formData.append('date', date);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('participation_fee', isLightning ? (participation_fee || 0) : participation_fee);
    formData.append('contents', contents);
    formData.append('team', team);
    formData.append('accessCode', accessCode);
    formData.append('isSelective', isSelective);
    formData.append('isLightning', isLightning);
    formData.append('hasParticipantRules', hasParticipantRules);
    formData.append('refundPolicy', isLightning ? 'none' : refundPolicy);
    if (!isLightning && refundPolicy === 'custom') {
      formData.append('refundCustomDescription', refundCustomDescription);
    }

    const allowCompanions = document.getElementById('allowCompanions')?.checked || false;
    const maxCompanionsPerUser = document.getElementById('maxCompanionsPerUser')?.value || 1;

    // 새 필드
    formData.append('tags', JSON.stringify(tags));
    if (applicationStartAt)     formData.append('applicationStartAt',     applicationStartAt);
    if (applicationDeadlineAt)  formData.append('applicationDeadlineAt',  applicationDeadlineAt);
    if (!isLightning && confirmationDeadlineAt) formData.append('confirmationDeadlineAt', confirmationDeadlineAt);
    if (!isLightning && maxApplicants) formData.append('maxApplicants', maxApplicants);
    formData.append('feeType', isLightning ? 'fixed' : feeType);
    if (!isLightning && feeType === 'range') formData.append('participation_fee_max', participation_fee_max);
    formData.append('allowCompanions', allowCompanions);
    formData.append('maxCompanionsPerUser', maxCompanionsPerUser);

    if (isSelective && !isLightning) {
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

    if (isLightning) {
      const questions = Array.from(document.querySelectorAll('#lightning-questions-container .question-item')).map(item => 
        item.querySelector('.lightning-question-text').value
      );
      if (questions.length === 0) {
        alert('번개 인증용 질문이 최소 1개 필요합니다.');
        return;
      }
      if (questions.some(q => !q.trim())) {
        alert('모든 인증 질문을 입력해주세요.');
        return;
      }
      formData.append('lightningQuestions', JSON.stringify(questions));
    }

    // 이미지 파일이 있는 경우 추가
    const images = document.getElementById('event-images')?.files || [];
    for (const image of Array.from(images)) {
      if (image.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      formData.append('images', image);
    }

    const response = await fetch('/events', { method: 'POST', body: formData });
    
    let result;
    try {
      result = await parseResponse(response);
    } catch (parseError) {
      throw parseError;
    }

    if (!response.ok) {
      throw new Error(result.message || '서버 에러가 발생했습니다.');
    }

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

/* =========================================================================
   2) 번개주최이벤트 - 질문 및 필드 토글 관리
   ========================================================================= */

let lightningQuestionCount = 0;

function toggleLightningSection() {
  const isLightning = document.getElementById('is-lightning').checked;
  
  // 번개용 질문 세션 표시/숨김
  const lightningSection = document.getElementById('lightning-question-section');
  if (lightningSection) {
    lightningSection.style.display = isLightning ? 'block' : 'none';
  }

  // 선발 이벤트 토글 비활성화/숨김
  const selectiveContainer = document.getElementById('container-is-selective');
  if (selectiveContainer) {
    selectiveContainer.style.display = isLightning ? 'none' : 'block';
  }
  
  // 번개 체크 시, 선발 체크 해제 및 관련 질문 초기화
  if (isLightning) {
    const isSelEl = document.getElementById('is-selective');
    if (isSelEl) {
      isSelEl.checked = false;
      toggleQuestionSection();
    }
  }

  // 필드 필수 속성 및 표시 토글
  const placeField = document.getElementById('field-place');
  const placeInput = document.getElementById('event-place');
  const participantsRow = document.getElementById('field-participants-row');
  const participantsInput = document.getElementById('event-participants');
  const confDeadlineFieldset = document.getElementById('field-confirmation-deadline-fieldset');
  const confDeadlineDate = document.getElementById('confirmation-deadline-date');
  const confDeadlineTime = document.getElementById('confirmation-deadline-time');
  const feeField = document.getElementById('field-participation-fee');
  const feeInput = document.getElementById('event-participation-fee');
  const refundPolicyField = document.getElementById('field-refund-policy');

  if (isLightning) {
    // 필수 속성 해제
    if (placeInput) placeInput.removeAttribute('required');
    if (participantsInput) participantsInput.removeAttribute('required');
    if (confDeadlineDate) confDeadlineDate.removeAttribute('required');
    if (confDeadlineTime) confDeadlineTime.removeAttribute('required');
    if (feeInput) feeInput.removeAttribute('required');

    // 숨김 처리
    if (placeField) placeField.style.display = 'none';
    if (participantsRow) participantsRow.style.display = 'none';
    if (confDeadlineFieldset) confDeadlineFieldset.style.display = 'none';
    if (feeField) feeField.style.display = 'none';
    if (refundPolicyField) refundPolicyField.style.display = 'none';

    // 기본 인증 질문 2개 자동 생성
    if (lightningQuestionCount === 0) {
      addLightningQuestionWithText("오늘 진행한 번개 모임의 활동 내용을 자세히 공유해주세요.");
      addLightningQuestionWithText("오늘 함께 번개에 참여한 부원들의 이름(전화번호 뒷자리)를 모두 적어주세요.");
    }
  } else {
    // 필수 속성 재부여
    if (placeInput) placeInput.setAttribute('required', 'true');
    if (participantsInput) participantsInput.setAttribute('required', 'true');
    if (confDeadlineDate) confDeadlineDate.setAttribute('required', 'true');
    if (confDeadlineTime) confDeadlineTime.setAttribute('required', 'true');
    if (feeInput) feeInput.setAttribute('required', 'true');

    // 노출 처리
    if (placeField) placeField.style.display = 'block';
    if (participantsRow) participantsRow.style.display = 'block';
    if (confDeadlineFieldset) confDeadlineFieldset.style.display = 'block';
    if (feeField) feeField.style.display = 'block';
    if (refundPolicyField) refundPolicyField.style.display = 'block';

    // 번개용 질문 컨테이너 비우기
    const container = document.getElementById('lightning-questions-container');
    if (container) container.innerHTML = '';
    lightningQuestionCount = 0;
  }
}

function addLightningQuestion() {
  addLightningQuestionWithText("");
}

function addLightningQuestionWithText(defaultText) {
  if (lightningQuestionCount >= 5) {
    alert('최대 5개의 질문만 추가할 수 있습니다.');
    return;
  }

  const container = document.getElementById('lightning-questions-container');
  if (!container) return;

  const questionDiv = document.createElement('div');
  questionDiv.className = 'question-item';
  questionDiv.innerHTML = `
    <button type="button" class="delete-question" onclick="deleteLightningQuestion(this)">×</button>
    <div class="form-group">
      <label>인증 질문 ${lightningQuestionCount + 1}</label>
      <textarea class="lightning-question-text"
                placeholder="인증 시 대답할 질문을 입력하세요"
                required>${defaultText}</textarea>
    </div>
  `;

  container.appendChild(questionDiv);
  lightningQuestionCount++;

  const addBtn = document.getElementById('add-lightning-question-btn');
  if (addBtn) addBtn.disabled = lightningQuestionCount >= 5;
}

function deleteLightningQuestion(button) {
  button.closest('.question-item').remove();
  lightningQuestionCount--;

  document.querySelectorAll('#lightning-questions-container .question-item').forEach((item, index) => {
    const label = item.querySelector('label');
    if (label) label.textContent = `인증 질문 ${index + 1}`;
  });

  const addBtn = document.getElementById('add-lightning-question-btn');
  if (addBtn) addBtn.disabled = false;
}

/* =========================================================================
   3) 선별적 이벤트 - 추가 질문 관리
   ========================================================================= */

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
    if (label) label.textContent = `질문 ${index + 1}`;
  });

  document.getElementById('add-question-btn').disabled = false;
}

/* =========================================================================
   3) 보고서 폼 - 옵션 로드 / 참가자 선택
   ========================================================================= */

let selectedParticipants = new Set();

async function loadStatusEventOptions() {
  try {
    const response = await fetch('/events');
    const events = await response.json();

    const sel = document.getElementById('status-event-select');
    if (!sel) return;

    sel.innerHTML = '<option value="">이벤트를 선택하세요...</option>';
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event._id;
      option.textContent = event.title;
      sel.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading event options:', error);
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
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.style.backgroundColor = '#fff3cd';
      setTimeout(() => { item.style.backgroundColor = ''; }, 1000);
      found = true;
      break;
    }
  }

  if (!found) alert('검색 결과가 없습니다.');
}

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

  previewContainer.innerHTML = participantElements.length
    ? participantElements.join('')
    : '<p>선택된 참가자가 없습니다</p>';

  const countElement = document.getElementById('selected-count');
  if (countElement) {
    countElement.textContent = selectedParticipants.size;
  }
}

function removeParticipant(participantId) {
  const checkbox = document.querySelector(`input[value="${participantId}"]`);
  if (checkbox) checkbox.checked = false;
  selectedParticipants.delete(participantId);
  updateSelectedParticipantsPreview();
}

async function loadApprovedParticipants() {
  try {
    const eventId = document.getElementById('report-event').value;
    const accessCode = document.getElementById('report-access-code').value;

    if (!eventId) { alert('이벤트를 선택해주세요.'); return; }
    if (!accessCode) { alert('접근 코드를 입력해주세요.'); return; }

    const verifyResponse = await fetch(`/events/${eventId}/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode })
    });
    if (!verifyResponse.ok) { alert('잘못된 접근 코드입니다.'); return; }

    const response = await fetch(`/events/${eventId}/approved-participants`);
    if (!response.ok) throw new Error('승인된 참가자 목록을 불러올 수 없습니다.');

    const approvedParticipants = await response.json();

    // 기존 체크박스 모두 해제
    document.querySelectorAll('#participant-list input[type="checkbox"]')
      .forEach(checkbox => {
        checkbox.checked = false;
        selectedParticipants.delete(checkbox.value);
      });

    // 승인된 참가자만 체크
    approvedParticipants.forEach(participant => {
      const checkbox = document.querySelector(`#participant-list input[value="${participant.id}"]`);
      if (checkbox) {
        checkbox.checked = true;
        selectedParticipants.add(participant.id);
      }
    });

    updateSelectedParticipantsPreview();

    const countElement = document.getElementById('selected-count');
    if (countElement) countElement.textContent = selectedParticipants.size;

    alert('승인된 참가자 목록을 불러왔습니다.');
  } catch (error) {
    console.error('Error loading approved participants:', error);
    alert('승인된 참가자 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

// inline onchange="handleParticipantSelection(this)" 콜백
function handleParticipantSelection(checkbox) {
  if (checkbox.checked) {
    selectedParticipants.add(checkbox.value);
  } else {
    selectedParticipants.delete(checkbox.value);
  }
  updateSelectedParticipantsPreview();
}

/* =========================================================================
   4) 보고서 제출 / 이벤트 종료 / 참가 현황 보기
   ========================================================================= */

async function submitReport() {
  try {
    const eventDropdown = document.getElementById('report-event');
    const selectedEventId = eventDropdown ? eventDropdown.value : null;
    const accessCode = document.getElementById('report-access-code').value;

    const chosenParticipants = Array.from(document.querySelectorAll('#participant-list input:checked'))
      .map(cb => ({ id: cb.value, displayName: cb.getAttribute('data-display') }));

    if (!selectedEventId) { alert('이벤트를 선택하세요.'); return; }
    if (!accessCode)      { alert('접근 코드를 입력하세요.'); return; }
    if (chosenParticipants.length === 0) {
      alert('최소 한 명의 참가자를 선택하세요.');
      return;
    }

    // 접근 코드 확인
    const verifyResponse = await fetch(`/events/${selectedEventId}/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode })
    });
    if (!verifyResponse.ok) { alert('잘못된 접근 코드입니다.'); return; }

    // 보고서 제출
    const response = await fetch(`/events/${selectedEventId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: chosenParticipants.map(p => p.id) })
    });

    if (response.ok) {
      alert('보고서 제출 완료!');
      await markEventAsEnded(selectedEventId);
      window.location.href = 'events.html';
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

async function markEventAsEnded(eventId) {
  try {
    const response = await fetch(`/events/${eventId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to mark event as ended');
    console.log(`Event ${eventId} marked as ended`);
  } catch (error) {
    console.error('Error marking event as ended:', error);
  }
}

// (legacy) 보고서 탭에서 호출되던 함수 — 현재는 '현황 보기' 탭으로 대체
function viewEventStatus() {
  const selectedEventId = document.getElementById('report-event').value;
  if (!selectedEventId) {
    alert('이벤트를 선택하세요.');
    return;
  }
  window.location.href = `event-status-staff.html?id=${selectedEventId}`;
}

// '신청자 관리' 탭 — 이벤트 선택만으로 페이지 이동 (접근 코드는 다음 페이지에서 검증)
function goToEventStatus() {
  const eventId = document.getElementById('status-event-select')?.value;
  if (!eventId) {
    alert('이벤트를 선택해주세요.');
    return;
  }
  window.location.href = `event-status-staff.html?id=${eventId}`;
}

/* =========================================================================
   5) DOM Ready - 폼 리스너 / 보고서 폼 초기화
   ========================================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  // (0) 권한 체크: 기획부(department === 'planning') 또는 관리자(role === 'admin')만 접근 허용
  try {
    const res = await fetch('/user/info_database');
    if (!res.ok) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login.html';
      return;
    }
    const user = await res.json();
    const isOfficerOrAdmin = user.role === 'officer' || user.role === 'admin';

    if (!isOfficerOrAdmin) {
      alert('운영진 또는 관리자만 접근할 수 있는 페이지입니다.');
      window.location.href = '/events.html';
      return;
    }
  } catch (err) {
    console.error('권한 확인 실패:', err);
  }
  // (1) 환불 정책 라디오: custom 선택 시 설명 입력칸 토글
  const refundPolicyRadios = document.querySelectorAll('input[name="refund-policy"]');
  const customRefundSection = document.getElementById('custom-refund-section');

  refundPolicyRadios.forEach(radio => {
    radio.addEventListener('change', function () {
      if (!customRefundSection) return;
      if (this.value === 'custom') {
        customRefundSection.style.display = 'block';
        const desc = document.getElementById('custom-refund-description');
        if (desc) desc.required = true;
      } else {
        customRefundSection.style.display = 'none';
        const desc = document.getElementById('custom-refund-description');
        if (desc) { desc.required = false; desc.value = ''; }
      }
    });
  });

  // (2) 참가자 리스트 체크박스 변경 감지 (이벤트 위임)
  const participantList = document.getElementById('participant-list');
  if (participantList) {
    participantList.addEventListener('change', function (e) {
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

  // (3) 신청자 관리 이벤트 목록 옵션 로드
  if (document.getElementById('status-event-select')) {
    loadStatusEventOptions();
  }
});

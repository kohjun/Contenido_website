document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const inviteToken = urlParams.get('invite');
  const inviterIdParam = urlParams.get('inviter');

  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const errorMsg = document.getElementById('error-msg');
  const contentView = document.getElementById('content-view');
  const successView = document.getElementById('success-view');

  const invTitle = document.getElementById('inv-event-title');
  const inviterBox = document.getElementById('inviter-box');
  const inviterName = document.getElementById('inviter-name');
  const invDateTime = document.getElementById('inv-date-time');
  const invPlace = document.getElementById('inv-place');
  const invFee = document.getElementById('inv-fee');
  const invContentsCard = document.getElementById('inv-contents-card');
  const invContents = document.getElementById('inv-contents');
  const questionsContainer = document.getElementById('questions-container');
  const inviteForm = document.getElementById('invite-form');
  const submitBtn = document.getElementById('submit-btn');

  if (!eventId || (!inviteToken && !inviterIdParam)) {
    loadingView.style.display = 'none';
    errorMsg.textContent = '유효하지 않은 초대장 링크입니다.';
    errorView.style.display = 'block';
    return;
  }

  let eventData = null;
  let inviterData = null;

  try {
    // 1. 이벤트 정보 가져오기
    const evRes = await fetch(`/events/${eventId}`);
    if (!evRes.ok) throw new Error('이벤트 정보를 찾을 수 없습니다.');
    eventData = await evRes.json();

    // 2. 초대한 부원 정보 가져오기
    const query = inviteToken ? `invite=${encodeURIComponent(inviteToken)}` : `inviterId=${encodeURIComponent(inviterIdParam)}`;
    const invRes = await fetch(`/events/${eventId}/inviter-info?${query}`);
    if (!invRes.ok) {
      const invErr = await invRes.json();
      throw new Error(invErr.message || '초대한 부원 정보를 불러올 수 없습니다.');
    }
    inviterData = await invRes.json();

    // 정보 렌더링
    invTitle.textContent = eventData.title || '콘테니도 이벤트';
    if (inviterData && inviterData.displayLabel) {
      inviterName.textContent = inviterData.displayLabel;
      inviterBox.style.display = 'block';
    }

    const dateStr = eventData.date
      ? new Date(eventData.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
      : '-';
    const timeStr = `${eventData.startTime || ''} ~ ${eventData.endTime || ''}`;
    invDateTime.textContent = `${dateStr} (${timeStr})`;
    invPlace.textContent = eventData.place || '상세 장소 추후 공지';
    invFee.textContent = eventData.participation_fee ? `${eventData.participation_fee.toLocaleString()}원` : '무료';

    // 이벤트 상세 본문 렌더링 & 펼치기/접기 토글
    if (eventData.contents && invContents && invContentsCard) {
      invContents.innerHTML = eventData.contents;
      invContentsCard.style.display = 'block';

      const toggleHeader = document.getElementById('inv-contents-toggle');
      const toggleText = document.getElementById('toggle-btn-text');
      const toggleIcon = document.getElementById('toggle-btn-icon');

      if (toggleHeader) {
        toggleHeader.addEventListener('click', () => {
          const isOpen = invContents.classList.contains('is-open');
          if (isOpen) {
            invContents.classList.remove('is-open');
            if (toggleText) toggleText.textContent = '펼치기';
            if (toggleIcon) toggleIcon.textContent = '▼';
          } else {
            invContents.classList.add('is-open');
            if (toggleText) toggleText.textContent = '접기';
            if (toggleIcon) toggleIcon.textContent = '▲';
          }
        });
      }
    }

    // 추가 질문 렌더링 (아이콘 없이 깔끔한 텍스트 라벨)
    if (eventData.isSelective && Array.isArray(eventData.additionalQuestions) && eventData.additionalQuestions.length > 0) {
      questionsContainer.innerHTML = `
        <div style="margin: 16px 0 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
          <h3 class="section-heading" style="margin-bottom: 12px;">추가 질문</h3>
          ${eventData.additionalQuestions.map((q, idx) => `
            <div class="form-group">
              <label>Q${idx + 1}. ${escapeHtml(q.questionText)}</label>
              <textarea class="form-control" name="guest_answer_${idx}" rows="2" required placeholder="답변을 입력해 주세요"></textarea>
            </div>
          `).join('')}
        </div>
      `;
    }

    loadingView.style.display = 'none';
    contentView.style.display = 'block';

  } catch (err) {
    console.error('Error loading invite page:', err);
    loadingView.style.display = 'none';
    errorMsg.textContent = err.message || '초대장 정보를 불러오는 데 실패했습니다.';
    errorView.style.display = 'block';
    return;
  }

  // Form submit handler
  inviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('ga-name').value.trim();
    const phone = document.getElementById('ga-phone').value.trim();
    const gender = document.getElementById('ga-gender').value;
    const age = document.getElementById('ga-age').value.trim();

    if (!name || !phone || !age) {
      alert('이름, 연락처, 나이를 모두 입력해 주세요.');
      return;
    }

    const answers = [];
    const textareas = document.querySelectorAll('textarea[name^="guest_answer_"]');
    textareas.forEach((ta, idx) => {
      answers.push({ questionIndex: idx, answerText: ta.value.trim() });
    });

    submitBtn.disabled = true;
    submitBtn.textContent = '신청 접수 중...';

    try {
      const res = await fetch(`/events/${eventId}/apply-companion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken,
          inviterUserId: inviterData ? inviterData.inviterId : inviterIdParam,
          guestInfo: { name, phone, gender, age: parseInt(age) },
          answers
        })
      });

      const data = await res.json();
      if (res.ok) {
        contentView.style.display = 'none';
        successView.style.display = 'block';
      } else {
        alert(data.message || '지인 동반 신청에 실패했습니다.');
        submitBtn.disabled = false;
        submitBtn.textContent = '지인 참가 신청 완료하기';
      }
    } catch (error) {
      console.error('Error submitting guest app:', error);
      alert('지인 신청 제출 중 오류가 발생했습니다.');
      submitBtn.disabled = false;
      submitBtn.textContent = '지인 참가 신청 완료하기';
    }
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

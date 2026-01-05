// 전역 변수
let currentEvent = null;
let deletedImages = new Set();
let isImageDeleted = false;

// 페이지 로드 시 이벤트 정보 로드
window.addEventListener('load', async () => {
  console.log('Additional-info.html 로드됨');
  
  // 인증 모듈 체크
  if (typeof AuthModule === 'undefined') {
    console.error('AuthModule이 로드되지 않았습니다');
    return;
  }

  // 인증 상태 확인
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) {
    console.log('인증되지 않은 사용자');
    return;
  }

  const eventId = new URLSearchParams(window.location.search).get('id');
  if (!eventId) {
    console.error('이벤트 ID가 없습니다');
    alert('올바르지 않은 접근입니다.');
    window.location.href = 'events.html';
    return;
  }

  console.log(`이벤트 ID ${eventId} 정보 로딩 시작`);
  await loadEventInfo(eventId);
  await initializeKakaoSDK();
});

async function loadEventInfo(eventId) {
  try {
    console.log(`이벤트 ${eventId} 정보 로딩`);
    const response = await fetch(`/events/${eventId}`);
    if (!response.ok) {
      throw new Error('이벤트 정보를 가져올 수 없습니다');
    }

    currentEvent = await response.json();
    console.log('이벤트 정보:', currentEvent);
    
    const user = await AuthModule.fetchUserInfo();
    if (!user) {
      console.error('사용자 정보 없음');
      return;
    }
    console.log('사용자 정보:', user);

    // 이벤트 정보 표시
    document.getElementById('event-title').textContent = currentEvent.title;
    document.getElementById('event-place').textContent = currentEvent.place;
    document.getElementById('event-date').textContent = currentEvent.date;
    document.getElementById('event-participants').textContent = `${currentEvent.participants}명`;
    document.getElementById('event-start-time').textContent = currentEvent.startTime;
    document.getElementById('event-end-time').textContent = currentEvent.endTime;
    document.getElementById('event-fee').textContent = `${currentEvent.participation_fee.toLocaleString()}원`;
    document.getElementById('event-contents').innerHTML = (currentEvent.contents || '').replace(/\n/g, '<br>');

    // 환불 정책 표시
    const refundPolicyDisplay = document.getElementById('refund-policy-display');
    if (refundPolicyDisplay) {
      if (currentEvent.refundPolicy === 'custom' && currentEvent.refundCustomDescription) {
        refundPolicyDisplay.innerHTML = `<p>${currentEvent.refundCustomDescription.replace(/\n/g, '<br>')}</p>`;
      } else {
        refundPolicyDisplay.innerHTML = '<p>입금이 확인된 이후에는 환불이 불가능합니다</p>';
      }
    }

    // 참가자 규칙 표시
    const detailsElem = document.getElementById('event-details');
    const kakaoShareButton = document.querySelector('.share-btn-container');
    if (detailsElem && currentEvent.hasParticipantRules !== undefined) {
      const rulesStatus = document.createElement('div');
      rulesStatus.className = 'rules-status';
      rulesStatus.innerHTML = currentEvent.hasParticipantRules ?
        '✔  <strong>참가자 규칙이 적용되는 이벤트입니다.</strong><br>활동부원은 일주일 이내 취소 시 경고 1회가 부과됩니다.' :
        '참가자 규칙이 적용되지 않는 일반 이벤트입니다.';
      if (kakaoShareButton && kakaoShareButton.parentNode === detailsElem) {
        detailsElem.insertBefore(rulesStatus, kakaoShareButton);
      } else {
        detailsElem.appendChild(rulesStatus);
      }
    }
    
    // 이미지 표시 (메인 이미지만)
    const mainEventImage = document.getElementById('main-event-image');
    if (mainEventImage) {
      let mainImageUrl = '/images/Basic_Event_Image.png';
      if (currentEvent.images && currentEvent.images.length > 0) {
        if (/^https?:\/\//.test(currentEvent.images[0])) {
          mainImageUrl = currentEvent.images[0];
        } else {
          mainImageUrl = window.location.origin + (currentEvent.images[0].startsWith('/') ? currentEvent.images[0] : '/' + currentEvent.images[0]);
        }
      } else {
        mainImageUrl = window.location.origin + '/images/Basic_Event_Image.png';
      }
      mainEventImage.onerror = function() {
        mainEventImage.src = window.location.origin + '/images/Basic_Event_Image.png';
      };
      mainEventImage.src = mainImageUrl;
    }

    // 생성자인 경우 수정 버튼 표시
    const modifyButton = document.getElementById('modify-button');
    if (modifyButton) {
      if (currentEvent.creator === user.id && (user.role === 'officer' || user.role === 'admin')) {
        modifyButton.style.display = 'block';
      } else {
        modifyButton.style.display = 'none';
      }
    }

    // 신청 상태 확인 및 버튼 업데이트
    const hasApplied = currentEvent.appliedParticipants.some(p => p.userId === user.id);
    const isActive = user.active;
    const approvedCount = currentEvent.appliedParticipants.filter(p => p.status === 'approved').length;
    const isFull = approvedCount >= currentEvent.participants;

    console.log(`신청 상태: 신청여부=${hasApplied}, 활성상태=${isActive}, 승인인원=${approvedCount}/${currentEvent.participants}, 마감여부=${isFull}`);

    const applicationSection = document.getElementById('application-section');
    if (applicationSection) {
      if (currentEvent.isSelective) {
        // 선별적 이벤트
        if (hasApplied) {
          applicationSection.innerHTML = `
            <p class="status-text">지원이 완료되었습니다</p>
            <div class="application-form" style="pointer-events: none; opacity: 0.7;">
              <h3>지원서 양식</h3>
              <form id="application-form">
                ${currentEvent.additionalQuestions.map((question, index) => `
                  <div class="question-section">
                    <p class="question-text">Q${index + 1}. ${question.questionText}</p>
                    <textarea class="answer-textarea" disabled></textarea>
                  </div>
                `).join('')}
                <button type="submit" class="submit-button" disabled>지원완료</button>
              </form>
            </div>
          `;
        } else if (!isActive) {
          applicationSection.innerHTML = `
            <p class="status-text">로그인 후 다시 시도해주세요.</p>
          `;
        } else if (isFull) {
          applicationSection.innerHTML = `
            <p class="status-text">모집이 마감되었습니다</p>
          `;
        } else {
          applicationSection.innerHTML = `
            <div class="application-form">
              <h3>지원서 양식</h3>
              <form id="application-form" onsubmit="submitApplication(event, '${eventId}')">
                ${currentEvent.additionalQuestions.map((question, index) => `
                  <div class="question-section">
                    <p class="question-text">Q${index + 1}. ${question.questionText}</p>
                    <textarea class="answer-textarea" name="answer-${index}" required></textarea>
                  </div>
                `).join('')}
                <button type="submit" class="submit-button">지원하기</button>
              </form>
            </div>
          `;
        }
      } else {
        // 일반 이벤트
        if (hasApplied) {
          applicationSection.innerHTML = `
            <p class="status-text">신청이 완료되었습니다</p>
            <button class="submit-button" disabled>신청완료</button>
          `;
        } else if (!isActive) {
          applicationSection.innerHTML = `
            <p class="status-text">로그인 후 다시 시도해주세요.</p>
          `;
        } else if (isFull) {
          applicationSection.innerHTML = `
            <p class="status-text">모집이 마감되었습니다</p>
          `;
        } else {
          applicationSection.innerHTML = `
            <button class="submit-button" onclick="applyForEvent('${eventId}')">신청하기</button>
          `;
        }
      }
    }

  } catch (error) {
    console.error('이벤트 정보 로딩 에러:', error);
    alert('이벤트 정보를 불러올 수 없습니다.');
  }
}

// 지원서 제출 함수
async function submitApplication(e, eventId) {
  e.preventDefault();
  
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;
  
  console.log(`이벤트 ${eventId} 지원서 제출 시도`);
  try {
    const formData = new FormData(e.target);
    const answers = [];
    for (let i = 0; i < currentEvent.additionalQuestions.length; i++) {
      answers.push({
        questionId: currentEvent.additionalQuestions[i]._id,
        answerText: formData.get(`answer-${i}`)
      });
    }

    const response = await fetch(`/events/${eventId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answers })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '지원 실패');
    }

    console.log('지원서 제출 성공');
    alert('지원서가 성공적으로 제출되었습니다.');
    updateApplicationStatus();
  } catch (error) {
    console.error('지원서 제출 에러:', error);
    alert(error.message);
  }
}

// 일반 이벤트 신청 함수
async function applyForEvent(eventId) {
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;
  
  console.log(`이벤트 ${eventId} 신청 시도`);
  try {
    const response = await fetch(`/events/${eventId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '신청 실패');
    }

    console.log('이벤트 신청 성공');
    alert('이벤트 신청이 성공적으로 완료되었습니다.');
    updateApplicationStatus();
  } catch (error) {
    console.error('이벤트 신청 에러:', error);
    alert(error.message);
  }
}

// 신청 상태 업데이트 함수
function updateApplicationStatus() {
  const applicationSection = document.getElementById('application-section');
  if (applicationSection) {
    applicationSection.innerHTML = `
      <p>신청이 완료되었습니다.</p>
      <button class="submit-button" disabled>신청완료</button>
    `;
  }
}

function enableEdit() {
  console.log('이벤트 수정 모드 활성화');
  
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
    const element = document.getElementById(field.id);
    if (!element) {
      console.warn(`Element ${field.id} not found`);
      return;
    }
    
    const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
    input.id = `edit-${field.id}`;
    input.type = field.type;
    
    // ============ 수정: 날짜 형식 변환 추가 ============
    if (field.type === 'date') {
      // "YYYY년 MM월 DD일" → "YYYY-MM-DD" 형식으로 변환
      const dateText = element.textContent.trim();
      const dateMatch = dateText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        input.value = `${year}-${month}-${day}`;
      } else {
        // 다른 형식일 경우 currentEvent에서 가져오기
        input.value = currentEvent.date || '';
      }
    }
    // ============ 날짜 형식 변환 끝 ============
    else if (field.type === 'number') {
      input.value = element.textContent.replace(/[^\d]/g, '');
    } else if (field.type === 'textarea') {
      input.value = element.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    } else {
      input.value = element.textContent.trim();
    }
    
    element.parentNode.replaceChild(input, element);
  });

  // ============ 수정: 이미지 편집 UI 생성 ============
  const imageSection = document.querySelector('.image-section .image-container');
  if (imageSection && currentEvent.images && currentEvent.images.length > 0) {
    // 기존 이미지들을 편집 가능한 형태로 표시
    imageSection.innerHTML = ''; // 기존 내용 지우기
    
    currentEvent.images.forEach((imagePath, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper';
      wrapper.dataset.imagePath = imagePath;
      
      const img = document.createElement('img');
      if (/^https?:\/\//.test(imagePath)) {
        img.src = imagePath;
      } else {
        img.src = window.location.origin + (imagePath.startsWith('/') ? imagePath : '/' + imagePath);
      }
      img.alt = `이벤트 이미지 ${index + 1}`;
      img.className = 'event-image-preview';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'image-delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.onclick = function() { handleImageDelete(this); };
      deleteBtn.style.display = 'block'; // 수정 모드에서는 보이도록
      
      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn);
      imageSection.appendChild(wrapper);
    });
    
    // 이미지 추가 버튼
    const uploadLabel = document.createElement('label');
    uploadLabel.htmlFor = 'edit-image';
    uploadLabel.className = 'image-upload-button';
    uploadLabel.id = 'image-upload-label';
    uploadLabel.innerHTML = `
      <span class="plus-icon">+</span>
      <span class="upload-text">이미지 추가</span>
    `;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'edit-image';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'image-upload-input';
    fileInput.onchange = handleImagePreview;
    
    uploadLabel.appendChild(fileInput);
    imageSection.appendChild(uploadLabel);
  }
  // ============ 이미지 편집 UI 생성 끝 ============

  // 환불 정책 편집 UI
  const refundPolicyEditContainer = document.createElement('div');
  refundPolicyEditContainer.className = 'refund-policy-edit-section';
  refundPolicyEditContainer.innerHTML = `
    <h4>환불 정책 수정</h4>
    <div class="radio-group">
      <label class="radio-label">
        <input type="radio" name="edit-refund-policy" value="standard" ${currentEvent.refundPolicy === 'standard' ? 'checked' : ''}>
        <span>일반적인 환불 규정</span>
        <small class="radio-hint">입금이 확인된 이후에는 환불이 불가능합니다</small>
      </label>
      
      <label class="radio-label">
        <input type="radio" name="edit-refund-policy" value="custom" ${currentEvent.refundPolicy === 'custom' ? 'checked' : ''}>
        <span>특수한 상황</span>
        <small class="radio-hint">특별한 환불 규정이 적용되는 경우</small>
      </label>
    </div>
    
    <div id="edit-custom-refund-section" style="display: ${currentEvent.refundPolicy === 'custom' ? 'block' : 'none'};">
      <label for="edit-custom-refund-description">환불 정책 설명:</label>
      <textarea id="edit-custom-refund-description" rows="4" placeholder="특수한 환불 정책에 대해 상세히 설명해주세요...">${currentEvent.refundPolicy === 'custom' ? (currentEvent.refundCustomDescription || '') : ''}</textarea>
    </div>
  `;

  // 참가자 규칙 체크박스
  const rulesCheckboxContainer = document.createElement('div');
  rulesCheckboxContainer.className = 'rules-checkbox-container';
  rulesCheckboxContainer.innerHTML = `
    <label class="checkbox-label">
      <input type="checkbox" id="edit-hasParticipantRules" ${currentEvent.hasParticipantRules ? 'checked' : ''}>
      <span>참가자 규칙 적용</span>
    </label>
    <span class="form-hint">활동부원은 취소 시 경고, 스타터/기존 참가자 패널티 없음</span>
  `;
  
  if (rulesCheckboxContainer.parentNode) {
    rulesCheckboxContainer.parentNode.insertBefore(refundPolicyEditContainer, rulesCheckboxContainer.nextSibling);
  }

  // 환불 정책 라디오 버튼 이벤트 리스너
  const editRefundPolicyRadios = document.querySelectorAll('input[name="edit-refund-policy"]');
  const editCustomRefundSection = document.getElementById('edit-custom-refund-section');

  editRefundPolicyRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'custom') {
        editCustomRefundSection.style.display = 'block';
        document.getElementById('edit-custom-refund-description').required = true;
      } else {
        editCustomRefundSection.style.display = 'none';
        document.getElementById('edit-custom-refund-description').required = false;
      }
    });
  });

  // 이벤트 디테일과 이미지 컨테이너 참조
  const eventDetails = document.getElementById('event-details');
  const imageContainer = document.getElementById('event-image-container');
  
  if (imageContainer && imageContainer.parentNode) {
    imageContainer.parentNode.insertBefore(rulesCheckboxContainer, imageContainer);
  } else {
    eventDetails.appendChild(rulesCheckboxContainer);
  }

  // UI 상태 업데이트
  document.getElementById('modify-button').style.display = 'none';
  document.getElementById('edit-controls').style.display = 'block';

  // 이미지 업로드 상태 갱신
  updateImageUploadStatus();
  console.log('이벤트 수정 모드 활성화 완료');
}

// 이미지 업로드 상태 업데이트 함수
function updateImageUploadStatus() {
  const currentImagesCount = document.querySelectorAll('.image-wrapper').length;
  const uploadButton = document.getElementById('image-upload-label');
  const imageInput = document.getElementById('edit-image');

  console.log(`현재 이미지 ${currentImagesCount}개`);
  if (currentImagesCount >= 3) {
    if (uploadButton) {
      uploadButton.classList.add('disabled');
      uploadButton.style.display = 'none';
    }
    if (imageInput) {
      imageInput.disabled = true;
    }
    console.log('이미지 최대 개수(3개) 도달, 업로드 버튼 비활성화');
  } else {
    if (uploadButton) {
      uploadButton.classList.remove('disabled');
      uploadButton.style.display = 'flex';
    }
    if (imageInput) {
      imageInput.disabled = false;
    }
    console.log(`이미지 추가 가능 (${currentImagesCount}/3)`);
  }
}

// 이미지 삭제 처리
function handleImageDelete(button) {
  const wrapper = button.closest('.image-wrapper');
  const imagePath = wrapper.dataset.imagePath;
  
  if (imagePath) {
    console.log(`이미지 삭제: ${imagePath}`);
    deletedImages.add(imagePath);
  }
  wrapper.remove();
  updateImageUploadStatus();
}

// 이미지 미리보기 처리
async function handleImagePreview(e) {
  const files = e.target.files;
  const mainEventImage = document.getElementById('main-event-image');
  if (mainEventImage && files.length > 0) {
    const reader = new FileReader();
    reader.onload = function(e) {
      mainEventImage.src = e.target.result;
    };
    reader.readAsDataURL(files[0]);
  }
}

async function submitEdit() {
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;

  const eventId = new URLSearchParams(window.location.search).get('id');
  console.log(`이벤트 ${eventId} 수정 제출`);

  try {
    let newImageUrls = [];
    const imageInput = document.getElementById('edit-image');

    // 새 이미지 업로드 처리
    if (imageInput && imageInput.files.length > 0) {
      console.log(`새 이미지 ${imageInput.files.length}개 업로드 시도`);
      const formData = new FormData();
      formData.append('eventId', eventId);
      Array.from(imageInput.files).forEach(file => {
        formData.append('images', file);
      });

      const imageResponse = await fetch('/events/upload-images', {
        method: 'POST',
        body: formData
      });

      if (!imageResponse.ok) {
        const errorData = await imageResponse.json();
        throw new Error(errorData.message);
      }

      const imageResult = await imageResponse.json();
      newImageUrls = imageResult.images;
      console.log(`새 이미지 업로드 성공: ${newImageUrls.length}개`);
    }

    // 현재 표시된 이미지들 수집
    let currentImages = Array.from(document.querySelectorAll('.image-wrapper'))
      .filter(wrapper => !deletedImages.has(wrapper.dataset.imagePath))
      .map(wrapper => wrapper.dataset.imagePath)
      .filter(path => path);

    if (!Array.isArray(currentImages)) currentImages = [];
    if (!Array.isArray(newImageUrls)) newImageUrls = [];
    const deletedImagesArr = Array.from(deletedImages || []);

    // 숫자 필드 파싱
    const participantsValue = parseInt(document.getElementById('edit-event-participants').value, 10);
    const participationFeeValue = parseInt(document.getElementById('edit-event-fee').value, 10);

    // 필수값 체크
    if (
      !document.getElementById('edit-event-title').value ||
      !document.getElementById('edit-event-place').value ||
      !document.getElementById('edit-event-date').value ||
      isNaN(participantsValue) ||
      !document.getElementById('edit-event-start-time').value ||
      !document.getElementById('edit-event-end-time').value ||
      isNaN(participationFeeValue) ||
      !document.getElementById('edit-event-contents').value
    ) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }
    
    const selectedRefundPolicy = document.querySelector('input[name="edit-refund-policy"]:checked')?.value || 'standard';
    const customRefundDescription = document.getElementById('edit-custom-refund-description')?.value || '';

    if (selectedRefundPolicy === 'custom' && !customRefundDescription.trim()) {
      alert('특수한 상황에 대한 환불 정책 설명을 입력해주세요.');
      return;
    }

    // 이벤트 데이터 업데이트
    const updatedData = {
      title: document.getElementById('edit-event-title').value,
      place: document.getElementById('edit-event-place').value,
      date: document.getElementById('edit-event-date').value,
      participants: participantsValue,
      startTime: document.getElementById('edit-event-start-time').value,
      endTime: document.getElementById('edit-event-end-time').value,
      participation_fee: participationFeeValue,
      contents: document.getElementById('edit-event-contents').value,
      currentImages,
      newImages: newImageUrls,
      deletedImages: deletedImagesArr,
      hasParticipantRules: document.getElementById('edit-hasParticipantRules').checked,
      refundPolicy: selectedRefundPolicy,
      refundCustomDescription: selectedRefundPolicy === 'custom' ? customRefundDescription : undefined
    };

    console.log('이벤트 업데이트 요청', updatedData);
    const response = await fetch(`/events/update-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ...updatedData })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    console.log('이벤트 수정 성공');
    alert('이벤트가 성공적으로 수정되었습니다.');
    location.reload();
  } catch (error) {
    console.error('이벤트 수정 에러:', error);
    alert(error.message || '수정 중 오류가 발생했습니다.');
  }
}

function cancelEdit() {
  console.log('이벤트 수정 취소');
  isImageDeleted = false;
  location.reload();
}

// 공유 모달 제어 함수
function openShareModal() {
  document.getElementById('shareModal').style.display = 'block';
  document.getElementById('modalBackdrop').style.display = 'block';
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}

// 링크 복사 함수
function copyLink() {
  const currentUrl = window.location.href;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        alert('링크가 클립보드에 복사되었습니다.');
        closeShareModal();
      })
      .catch(err => {
        console.error('링크 복사 실패:', err);
        fallbackCopyLink(currentUrl);
      });
  } else {
    fallbackCopyLink(currentUrl);
  }
}

function fallbackCopyLink(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    alert('링크가 클립보드에 복사되었습니다.');
    closeShareModal();
  } catch (err) {
    console.error('링크 복사 실패:', err);
    alert('링크 복사에 실패했습니다. 수동으로 복사해주세요: ' + text);
  }
  document.body.removeChild(textArea);
}

// 카카오 SDK 초기화
async function initializeKakaoSDK() {
  if (!window.Kakao) {
    console.error('Kakao SDK가 로드되지 않았습니다');
    return;
  }

  if (!window.Kakao.isInitialized()) {
    try {
      window.Kakao.init('f2d45aaa54eee45a44c78408b4d02a40');
      console.log('Kakao SDK 초기화 완료');
    } catch (error) {
      console.error('Kakao SDK 초기화 실패:', error);
    }
  }
}

// 카카오톡 공유 초기화
function initializeKakaoShare() {
  if (!window.Kakao || !window.Kakao.isInitialized()) {
    console.error('Kakao SDK가 초기화되지 않았습니다');
    alert('카카오톡 공유 기능을 사용할 수 없습니다.');
    return;
  }

  if (!currentEvent) {
    console.error('이벤트 정보가 없습니다');
    alert('이벤트 정보를 불러올 수 없습니다.');
    return;
  }

  const imageUrl = currentEvent.images && currentEvent.images.length > 0
    ? (currentEvent.images[0].startsWith('http') ? currentEvent.images[0] : window.location.origin + currentEvent.images[0])
    : window.location.origin + '/images/Basic_Event_Image.png';

  try {
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: currentEvent.title,
        description: `장소: ${currentEvent.place}\n날짜: ${currentEvent.date}\n시간: ${currentEvent.startTime} ~ ${currentEvent.endTime}`,
        imageUrl: imageUrl,
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href
        }
      },
      buttons: [
        {
          title: '자세히 보기',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href
          }
        }
      ]
    });
    console.log('카카오톡 공유 성공');
    closeShareModal();
  } catch (error) {
    console.error('카카오톡 공유 실패:', error);
    alert('카카오톡 공유에 실패했습니다.');
  }
}
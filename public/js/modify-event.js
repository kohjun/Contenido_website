let originalData = {};
let deletedImages = new Set();
let currentEvent = null; // 전역 변수로 현재 이벤트 데이터 저장
let currentUser = null; // 현재 사용자 정보 저장

async function loadEventContent(eventId) {
  try {
    // 인증 상태 확인 (이제 nav-injector에 포함된 AuthModule 사용)
    const isAuthenticated = await AuthModule.checkAuthentication();
    if (!isAuthenticated) return;
    
    // 사용자 정보 로드
    const user = await AuthModule.loadUserInfo();
    if (!user) {
      alert('사용자 정보를 불러오는데 실패했습니다.');
      return;
    }
    
    console.log(`이벤트 ID ${eventId} 정보 로드 시도`);
    const response = await fetch(`/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`이벤트 정보를 가져오는데 실패했습니다. 상태: ${response.status}`);
    }
    
    const event = await response.json();
    currentEvent = event;  // 전역 변수에 저장
    originalData = { ...event };
    console.log(`이벤트 정보 로드 성공: ${event.title}`);

    // 기본 정보 표시
    const titleElem = document.getElementById('event-title');
    const placeElem = document.getElementById('event-place');
    const dateElem = document.getElementById('event-date');
    const participantsElem = document.getElementById('event-participants');
    const startTimeElem = document.getElementById('event-start-time');
    const endTimeElem = document.getElementById('event-end-time');
    const feeElem = document.getElementById('event-fee');
    const contentsElem = document.getElementById('event-contents');
    const detailsElem = document.getElementById('event-details');
    const mainEventImage = document.getElementById('main-event-image');
    const modifyButton = document.getElementById('modify-button');
    const applicationSection = document.getElementById('application-section');
    const kakaoShareButton = document.getElementById('kakao-share-button');

    if (titleElem) titleElem.textContent = currentEvent.title;
    if (placeElem) placeElem.textContent = currentEvent.place;
    if (dateElem) dateElem.textContent = new Date(currentEvent.date)
      .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    if (participantsElem) participantsElem.textContent = currentEvent.participants + '명';
    if (startTimeElem) startTimeElem.textContent = currentEvent.startTime;
    if (endTimeElem) endTimeElem.textContent = currentEvent.endTime;
    if (feeElem) feeElem.textContent = currentEvent.participation_fee.toLocaleString() + '원';
    if (contentsElem) contentsElem.innerHTML = currentEvent.contents.replace(/\n/g, "<br>");

    // 참가자 규칙 상태 표시
    if (detailsElem && kakaoShareButton) {
      const rulesStatus = document.createElement('p');
      rulesStatus.className = 'rules-status';
      rulesStatus.innerHTML = currentEvent.hasParticipantRules ?
        '✔  <strong>참가자 규칙이 적용되는 이벤트입니다.</strong><br>활동부원은 일주일 이내 취소 시 경고 1회가 부과됩니다.' :
        '참가자 규칙이 적용되지 않는 일반 이벤트입니다.';
      detailsElem.insertBefore(rulesStatus, kakaoShareButton);
    }

    // 이미지 표시 (메인 이미지만)
    if (mainEventImage) {
      let mainImageUrl = '/images/Basic_Event_Image.png';
      if (currentEvent.images && currentEvent.images.length > 0) {
        // 절대경로/상대경로 모두 지원, 항상 window.location.origin 붙이기
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
            <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
            <button class="submit-button" disabled>지원불가</button>
          `;
        } else if (isFull) {
          applicationSection.innerHTML = `
            <p class="status-text">모집이 마감되었습니다</p>
            <button class="submit-button" disabled>마감</button>
          `;
        } else {
          applicationSection.innerHTML = `
            <div class="application-form">
              <h3>지원서 작성</h3>
              <form id="application-form" onsubmit="submitApplication(event)">
                ${currentEvent.additionalQuestions.map((question, index) => `
                  <div class="question-section">
                    <p class="question-text">Q${index + 1}. ${question.questionText}</p>
                    <textarea class="answer-textarea" name="answer_${index}" required></textarea>
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
            <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
            <button class="submit-button" disabled>신청불가</button>
          `;
        } else if (isFull) {
          applicationSection.innerHTML = `
            <p class="status-text">모집이 마감되었습니다</p>
            <button class="submit-button" disabled>마감</button>
          `;
        } else {
          applicationSection.innerHTML = `
            <button onclick="applyForEvent('${currentEvent._id}')" class="submit-button">신청하기</button>
          `;
        }
      }
    }

    // 카카오 공유 버튼 초기화
    await initializeKakaoShare();

  } catch (error) {
    console.error('이벤트 정보 로드 중 에러:', error);
    alert('이벤트 정보를 불러오는데 실패했습니다.');
  }
}

// 카카오 초기화 함수
async function initializeKakao() {
  try {
    if (window.Kakao && Kakao.isInitialized && Kakao.isInitialized()) {
      // 이미 초기화된 경우 재초기화하지 않음
      return;
    }
    console.log('카카오 API 키 요청');
    const response = await fetch('/events/kakao-key');
    const data = await response.json();
    console.log('카카오 API 초기화 시작');
    Kakao.init(data.kakaoKey);
    console.log('카카오 API 초기화 완료');
  } catch (error) {
    console.error('카카오 키 초기화 실패:', error);
  }
}

// 카카오톡 공유 함수
async function initializeKakaoShare() {
  if (!currentEvent) {
    console.error('이벤트 데이터가 없습니다.');
    return;
  }

  await initializeKakao();

  const kakaoButton = document.getElementById('kakao-share-button');
  if (!kakaoButton) {
    console.log('카카오 공유 버튼을 찾을 수 없음');
    return;
  }

  // 이벤트 이미지 URL 설정 (항상 절대 경로)
  const eventImageUrl = currentEvent.images && currentEvent.images.length > 0
    ? window.location.origin + (currentEvent.images[0].startsWith('/') ? currentEvent.images[0] : '/' + currentEvent.images[0])
    : window.location.origin + '/images/Basic_Event_Image.png';

  // D-Day 계산 추가
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(currentEvent.date);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let dDayText;
  if (diffDays > 0) {
    dDayText = `D-${diffDays}`;
  } else if (diffDays === 0) {
    dDayText = 'D-Day';
  } else {
    dDayText = '종료';
  }


  console.log('카카오 공유 버튼 설정');
  Kakao.Share.createDefaultButton({
    container: '#kakao-share-button',
    objectType: 'feed',
    content: {
      title: `[${currentEvent.team}] ${currentEvent.title}`,
      description: currentEvent.contents,
      imageUrl: eventImageUrl,
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    itemContent: {
      profileImageUrl: eventImageUrl,
      titleImageText: currentEvent.title,
      titleImageCategory: currentEvent.team,
      items: [
        {
          item: '일시',
          itemOp: `${new Date(currentEvent.date).toLocaleDateString()}`,
        },
        {
          item: '시간',
          itemOp: `${currentEvent.startTime}~${currentEvent.endTime}`,
        },
        {
          item: '장소',
          itemOp: currentEvent.place,
        },
        {
          item: '인원',
          itemOp: `${currentEvent.participants}명`,
        },
        {
          item: '참가비',
          itemOp: `${currentEvent.participation_fee.toLocaleString()}원`,
        },
      ],
      sum: '행사일',
      sumOp: dDayText, // 계산된 D-Day 텍스트 적용
    },
    buttons: [
      {
        title: '이벤트 신청하기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      }
    ],
  });
  console.log('카카오 공유 버튼 설정 완료');
}

// 지원서 제출 함수
async function submitApplication(e) {
  e.preventDefault();
  const eventId = new URLSearchParams(window.location.search).get('id');
  
  // 인증 상태 확인
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;
  
  console.log(`이벤트 ${eventId} 지원서 제출 시도`);
  const answers = Array.from(document.querySelectorAll('.answer-textarea')).map(textarea => ({
    answerText: textarea.value
  }));

  try {
    const response = await fetch(`/events/${eventId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answers })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '신청 실패');
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
  // 인증 상태 확인
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
    const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
    input.id = `edit-${field.id}`;
    input.type = field.type;
    
    if (field.type === 'number') {
      input.value = element.textContent.replace(/[^\d]/g, '');
    } else {
      input.value = element.textContent.trim();
    }
    
    element.parentNode.replaceChild(input, element);
  });

  // 참가자 규칙 체크박스 추가
  const rulesCheckboxContainer = document.createElement('div');
  rulesCheckboxContainer.className = 'form-group';
  rulesCheckboxContainer.innerHTML = `
    <label class="checkbox-label">
      <input type="checkbox" id="edit-hasParticipantRules" ${currentEvent.hasParticipantRules ? 'checked' : ''}>
      <span>참가자 규칙 적용</span>
    </label>
    <span class="form-hint">활동부원은 취소 시 경고, 스타터/기존 참가자 패널티 없음</span>
  `;

  // 이벤트 디테일과 이미지 컨테이너 참조 가져오기
  const eventDetails = document.getElementById('event-details');
  const imageContainer = document.getElementById('event-image-container');
  
  // 이미지 컨테이너가 있는지 확인하고 있다면 그 앞에 체크박스 컨테이너 삽입
  if (imageContainer && imageContainer.parentNode) {
    imageContainer.parentNode.insertBefore(rulesCheckboxContainer, imageContainer);
  } else {
    // 이미지 컨테이너가 없다면 이벤트 디테일 끝에 추가
    eventDetails.appendChild(rulesCheckboxContainer);
  }

  // 이미지 관련 UI 활성화
  const currentImages = document.querySelectorAll('.image-wrapper');
  currentImages.forEach(wrapper => {
    const deleteBtn = wrapper.querySelector('.image-delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = 'block';
    }
  });

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
    uploadButton.classList.add('disabled');
    imageInput.disabled = true;
    uploadButton.style.display = 'none';  // 3개 이상이면 + 버튼 숨김
    console.log('이미지 최대 개수(3개) 도달, 업로드 버튼 비활성화');
  } else {
    uploadButton.classList.remove('disabled');
    imageInput.disabled = false;
    uploadButton.style.display = 'flex';  // 3개 미만이면 + 버튼 표시
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

// 이미지 미리보기 처리 (메인 이미지만)
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
  // 인증 상태 확인
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
      
      // 이미지 파일들 추가
      Array.from(imageInput.files).forEach(file => {
        formData.append('images', file);
      });

      // 이미지 업로드 요청
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

    // 현재 표시된 이미지들 수집 (삭제되지 않은 기존 이미지들)
    const currentImages = Array.from(document.querySelectorAll('.image-wrapper'))
      .filter(wrapper => !deletedImages.has(wrapper.dataset.imagePath))
      .map(wrapper => wrapper.dataset.imagePath)
      .filter(path => path); // null/undefined 제거

    console.log(`현재 이미지: ${currentImages.length}개, 삭제된 이미지: ${deletedImages.size}개, 새 이미지: ${newImageUrls.length}개`);

    // 이벤트 데이터 업데이트
    const updatedData = {
      title: document.getElementById('edit-event-title').value,
      place: document.getElementById('edit-event-place').value,
      date: document.getElementById('edit-event-date').value,
      participants: parseInt(document.getElementById('edit-event-participants').value, 10),
      startTime: document.getElementById('edit-event-start-time').value,
      endTime: document.getElementById('edit-event-end-time').value,
      participation_fee: parseInt(document.getElementById('edit-event-fee').value, 10),
      contents: document.getElementById('edit-event-contents').value,
      currentImages,
      newImages: newImageUrls,
      deletedImages: Array.from(deletedImages),
      hasParticipantRules: document.getElementById('edit-hasParticipantRules').checked,
    };

    console.log('이벤트 업데이트 요청');
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

// 링크 복사 대체 함수
function fallbackCopyLink(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    alert('링크가 클립보드에 복사되었습니다.');
  } catch (err) {
    console.error('링크 복사 실패:', err);
    alert('링크 복사에 실패했습니다. 직접 URL을 복사해주세요.');
  }
  document.body.removeChild(textArea);
  closeShareModal();
}



document.addEventListener('DOMContentLoaded', () => {
  console.log('이벤트 상세 페이지 로드');
  const eventId = new URLSearchParams(window.location.search).get('id');
  if (eventId) {
    console.log(`이벤트 ID: ${eventId}`);
    loadEventContent(eventId);
  } else {
    console.error('이벤트 ID가 없음');
    alert('이벤트 ID가 없습니다.');
  }
});
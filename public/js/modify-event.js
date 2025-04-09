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
    document.getElementById('event-title').textContent = currentEvent.title;
    document.getElementById('event-place').textContent = currentEvent.place;
    document.getElementById('event-date').textContent = new Date(currentEvent.date).toISOString().split('T')[0];
    document.getElementById('event-participants').textContent = currentEvent.participants + '명';
    document.getElementById('event-start-time').textContent = currentEvent.startTime;
    document.getElementById('event-end-time').textContent = currentEvent.endTime;
    document.getElementById('event-fee').textContent = currentEvent.participation_fee.toLocaleString() + '원';
    document.getElementById('event-contents').innerHTML = currentEvent.contents.replace(/\n/g, "<br>");

    // 이미지 표시
    const imageContainer = document.getElementById('event-image-container');
    if (currentEvent.images && currentEvent.images.length > 0) {
      imageContainer.innerHTML = currentEvent.images.map((image, index) => `
        <div class="image-wrapper" data-image-path="${image}">
          <div class="event-image">
            <img src="${image}" alt="Event image ${index + 1}">
            <button type="button" class="image-delete-btn" onclick="handleImageDelete(this)" style="display: none;">×</button>
          </div>
        </div>
      `).join('');
    }

    // 생성자인 경우 수정 버튼 표시
    if (currentEvent.creator === user.id && (user.role === 'officer' || user.role === 'admin')) {
      console.log('이벤트 수정 권한 있음, 수정 버튼 표시');
      document.getElementById('modify-button').style.display = 'block';
    } else {
      console.log(`이벤트 수정 권한 없음 (사용자 ID: ${user.id}, 생성자 ID: ${currentEvent.creator})`);
    }

    // 신청 상태 확인 및 버튼 업데이트
    const hasApplied = currentEvent.appliedParticipants.some(p => p.userId === user.id);
    const isActive = user.active;
    const approvedCount = currentEvent.appliedParticipants.filter(p => p.status === 'approved').length;
    const isFull = approvedCount >= currentEvent.participants;

    console.log(`신청 상태: 신청여부=${hasApplied}, 활성상태=${isActive}, 승인인원=${approvedCount}/${currentEvent.participants}, 마감여부=${isFull}`);

    const applicationSection = document.getElementById('application-section');
    if (currentEvent.isSelective) {
      // 선별적 이벤트
      if (hasApplied) {
        console.log('이미 지원한 선별적 이벤트');
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
        console.log('활동부원이 아닌 사용자');
        applicationSection.innerHTML = `
          <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
          <button class="submit-button" disabled>지원불가</button>
        `;
      } else if (isFull) {
        console.log('모집 마감된 이벤트');
        applicationSection.innerHTML = `
          <p class="status-text">모집이 마감되었습니다</p>
          <button class="submit-button" disabled>마감</button>
        `;
      } else {
        console.log('지원 가능한 선별적 이벤트');
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
        console.log('이미 신청한 일반 이벤트');
        applicationSection.innerHTML = `
          <p class="status-text">신청이 완료되었습니다</p>
          <button class="submit-button" disabled>신청완료</button>
        `;
      } else if (!isActive) {
        console.log('활동부원이 아닌 사용자');
        applicationSection.innerHTML = `
          <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
          <button class="submit-button" disabled>신청불가</button>
        `;
      } else if (isFull) {
        console.log('모집 마감된 이벤트');
        applicationSection.innerHTML = `
          <p class="status-text">모집이 마감되었습니다</p>
          <button class="submit-button" disabled>마감</button>
        `;
      } else {
        console.log('신청 가능한 일반 이벤트');
        applicationSection.innerHTML = `
          <button onclick="applyForEvent('${currentEvent._id}')" class="submit-button">신청하기</button>
        `;
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

// 카카오톡 공유 함수 수정
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

  // 이벤트 이미지 URL 설정 (절대 경로)
  const eventImageUrl = currentEvent.images && currentEvent.images.length > 0
    ? `${window.location.origin}${currentEvent.images[0]}`
    : `${window.location.origin}/images/default-event.png`;

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
  applicationSection.innerHTML = `
    <p>신청이 완료되었습니다.</p>
    <button class="submit-button" disabled>신청완료</button>
  `;
}

function enableEdit() {
  console.log('이벤트 수정 모드 활성화');
  // 기존 필드 변환
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

    if (field.type === 'number') {
      input.value = span.textContent.replace(/[^\d]/g, '');
    } else {
      input.value = span.textContent;
    }

    span.replaceWith(input);
  });

  // 이미지 관련 UI 활성화
  const imageContainer = document.getElementById('event-image-container');
  const currentImages = imageContainer.querySelectorAll('.image-wrapper');

  // 각 이미지에 삭제 버튼 표시
  currentImages.forEach(wrapper => {
    const deleteBtn = wrapper.querySelector('.image-delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = 'block';
    }
  });

  // 이미지 업로드 입력 활성화
  const imageInput = document.getElementById('edit-image');
  if (imageInput) {
    imageInput.addEventListener('change', handleImagePreview);
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

// 이미지 미리보기 처리
async function handleImagePreview(e) {
  const files = e.target.files;
  const currentImagesCount = document.querySelectorAll('.image-wrapper').length;
  const remainingSlots = 3 - currentImagesCount;

  console.log(`이미지 미리보기: ${files.length}개 선택됨, 남은 슬롯 ${remainingSlots}개`);

  if (files.length > remainingSlots) {
    alert(`최대 ${remainingSlots}장의 이미지만 추가할 수 있습니다.`);
    e.target.value = '';
    return;
  }

  const imagePreview = document.getElementById('image-preview');
  imagePreview.innerHTML = ''; // 미리보기 초기화

  for (const file of files) {
    console.log(`이미지 미리보기 생성: ${file.name}`);
    const reader = new FileReader();
    reader.onload = function(e) {
      imagePreview.innerHTML += `
        <div class="image-wrapper">
          <div class="event-image">
            <img src="${e.target.result}" alt="Preview">
          </div>
        </div>`;
    };
    reader.readAsDataURL(file);
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
      deletedImages: Array.from(deletedImages)
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

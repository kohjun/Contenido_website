let originalData = {};
let deletedImages = new Set(); // 삭제된 이미지 추적

async function loadEventContent(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-place').textContent = event.place;
    document.getElementById('event-date').textContent = new Date(event.date).toISOString().split('T')[0];
    document.getElementById('event-participants').textContent = event.participants + '명';
    document.getElementById('event-start-time').textContent = event.startTime;
    document.getElementById('event-end-time').textContent = event.endTime;
    document.getElementById('event-fee').textContent = event.participation_fee.toLocaleString() + '원';
    document.getElementById('event-contents').textContent = event.contents;

    // 이미지들 표시
    const imageContainer = document.getElementById('event-image-container');
    if (event.images && event.images.length > 0) {
      imageContainer.innerHTML = event.images.map((image, index) => `
        <div class="image-wrapper" data-image-path="${image}">
          <div class="event-image">
            <img src="${image}" alt="Event image ${index + 1}">
            <button type="button" class="image-delete-btn" onclick="handleImageDelete(this)" style="display: none;">×</button>
          </div>
        </div>
      `).join('');
    }
    
    originalData = { ...event };

    const userResponse = await fetch('/user/info');
    const user = await userResponse.json();

    if (event.creator === user.id && user.role === 'officer') {
      document.getElementById('modify-button').style.display = 'block';
    } else {
      document.getElementById('modify-button').style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading event content:', error);
    alert('이벤트 내용을 불러오는 중 문제가 발생했습니다.');
  }
}

function enableEdit() {
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
}


// 이미지 업로드 상태 업데이트 함수
function updateImageUploadStatus() {
  const currentImagesCount = document.querySelectorAll('.image-wrapper').length;
  const uploadButton = document.getElementById('image-upload-label');
  const imageInput = document.getElementById('edit-image');

  if (currentImagesCount >= 3) {
    uploadButton.classList.add('disabled');
    imageInput.disabled = true;
    uploadButton.style.display = 'none';  // 3개 이상이면 + 버튼 숨김
  } else {
    uploadButton.classList.remove('disabled');
    imageInput.disabled = false;
    uploadButton.style.display = 'flex';  // 3개 미만이면 + 버튼 표시
  }
}

// 이미지 삭제 처리
function handleImageDelete(button) {
  const wrapper = button.closest('.image-wrapper');
  const imagePath = wrapper.dataset.imagePath;
  
  if (imagePath) {
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

  if (files.length > remainingSlots) {
    alert(`최대 ${remainingSlots}장의 이미지만 추가할 수 있습니다.`);
    e.target.value = '';
    return;
  }

  const imagePreview = document.getElementById('image-preview');
  imagePreview.innerHTML = ''; // 미리보기 초기화

  for (const file of files) {
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
  const eventId = new URLSearchParams(window.location.search).get('id');

  try {
    let newImageUrls = [];
    const imageInput = document.getElementById('edit-image');

    // 새 이미지 업로드 처리
    if (imageInput && imageInput.files.length > 0) {
      const formData = new FormData();
      Array.from(imageInput.files).forEach(file => {
        formData.append('images', file);
      });
      formData.append('eventId', eventId);

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
    }

    // 현재 표시된 이미지들 수집 (삭제되지 않은 기존 이미지들)
    const currentImages = Array.from(document.querySelectorAll('.image-wrapper'))
      .filter(wrapper => !deletedImages.has(wrapper.dataset.imagePath))
      .map(wrapper => wrapper.dataset.imagePath)
      .filter(path => path); // null/undefined 제거

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

    const response = await fetch(`/events/update-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ...updatedData })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    alert('이벤트가 성공적으로 수정되었습니다.');
    location.reload();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || '수정 중 오류가 발생했습니다.');
  }
}

function cancelEdit() {
  isImageDeleted = false;
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  const eventId = new URLSearchParams(window.location.search).get('id');
  if (eventId) {
    loadEventContent(eventId);
  } else {
    alert('이벤트 ID가 없습니다.');
  }
});
let currentUserId;
let userReview = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchCurrentUserId();
    
    const eventId = new URLSearchParams(window.location.search).get('id');
    if (!eventId) {
      alert('이벤트 ID가 없습니다.');
      return;
    }

    await loadEventDetails(eventId);
    await checkUserReview(eventId);
    await loadReviews(eventId);
    initStarRating();

    document.getElementById('review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitReview(eventId);
    });
  } catch (error) {
    console.error('Error initializing page:', error);
  }
});

async function fetchCurrentUserId() {
  try {
    const response = await fetch('/user/info');
    if (response.ok) {
      const user = await response.json();
      currentUserId = user.id;
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
}

function initStarRating() {
  const stars = document.querySelectorAll('.star');
  const ratingInput = document.getElementById('rating');

  stars.forEach(star => {
    star.addEventListener('click', (e) => {
      const rating = e.target.dataset.rating;
      ratingInput.value = rating;
      updateStars(rating);
    });

    star.addEventListener('mouseover', (e) => {
      const rating = e.target.dataset.rating;
      highlightStars(rating);
    });
  });

  document.querySelector('.stars').addEventListener('mouseleave', () => {
    const currentRating = ratingInput.value;
    currentRating ? updateStars(currentRating) : resetStars();
  });
}

function updateStars(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.classList.remove('active');
    if (star.dataset.rating <= rating) {
      star.classList.add('active');
    }
  });
}

function highlightStars(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.classList.remove('active');
    if (star.dataset.rating <= rating) {
      star.classList.add('active');
    }
  });
}

function resetStars() {
  document.querySelectorAll('.star').forEach(star => {
    star.classList.remove('active');
  });
}

async function loadEventDetails(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    document.getElementById('event-details').innerHTML = `
    <div class="event-info">
      <h2>${event.title}</h2>
      <p class="event-date">날짜 : ${new Date(event.date).toLocaleDateString()}</p>
      <p class="event-place">장소 : ${event.place}</p>
      <p class="event-participation_fee">참가비 : ${event.participation_fee}원</p>
      <p class="event-content">${event.contents.replace(/\n/g, "<br>")}</p>
    </div>
  `;
  

    // 참가자 확인 및 폼 표시 설정
    const isParticipant = event.finalParticipants?.includes(currentUserId);
    document.getElementById('review-form').style.display = isParticipant ? 'block' : 'none';
    document.getElementById('review-notice').style.display = isParticipant ? 'none' : 'block';
    
    if (!isParticipant) {
      document.getElementById('review-notice').textContent = '이벤트 참가자만 후기를 작성할 수 있습니다.';
    }
  } catch (error) {
    console.error('Error loading event details:', error);
    alert('이벤트 정보를 불러오는데 실패했습니다.');
  }
}

async function submitReview(eventId) {
  const rating = document.getElementById('rating').value;
  const comment = document.getElementById('comment').value;
  const isAnonymous = document.getElementById('anonymous').checked;

  if (!rating) {
    alert('별점을 선택해주세요.');
    return;
  }

  try {
    const method = userReview?._id ? 'PUT' : 'POST';
    const url = userReview?._id ? `/reviews/${userReview._id}` : '/reviews';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, rating, comment, isAnonymous }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    alert(userReview ? '후기가 수정되었습니다.' : '후기가 등록되었습니다.');
    await loadReviews(eventId);
    
    // 폼 초기화
    document.getElementById('review-form').reset();
    resetStars();
    document.querySelector('#review-form button[type="submit"]').textContent = '후기 등록';
    userReview = method === 'PUT' ? null : await response.json();
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('후기 처리 중 오류가 발생했습니다: ' + error.message);
  }
}

async function loadReviews(eventId) {
  try {
    const response = await fetch(`/reviews?eventId=${eventId}`);
    const reviews = await response.json();
    
    document.getElementById('reviews-list').innerHTML = reviews.length > 0
      ? reviews.map(reviewToHtml).join('')
      : '<p class="no-reviews">아직 작성된 후기가 없습니다.</p>';
  } catch (error) {
    console.error('Error loading reviews:', error);
    alert('후기를 불러오는데 실패했습니다.');
  }
}

function reviewToHtml(review) {
  const userName = review.isAnonymous ? '익명' : review.userId?.displayName || '알 수 없음';
  const createdAt = new Date(review.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const isOwner = review.userId?._id === currentUserId;

  return `
    <div class="review">
      <div class="review-header">
        <span class="review-author">${userName}</span>
        <span class="review-stars">${stars}</span>
        ${isOwner ? `
          <div class="review-actions">
            <button onclick="editReview('${review._id}')" class="review-action-btn edit">수정</button>
            <button onclick="deleteReview('${review._id}')" class="review-action-btn delete">삭제</button>
          </div>
        ` : ''}
      </div>
      <p class="review-content">${review.comment}</p>
      <p class="review-date">${createdAt}</p>
    </div>
  `;
}
async function editReview(reviewId) {
  const review = userReview;
  if (!review) return;

  // 별점 설정
  document.getElementById('rating').value = review.rating;
  updateStars(review.rating);

  // 나머지 필드 설정
  document.getElementById('comment').value = review.comment;
  document.getElementById('anonymous').checked = review.isAnonymous;

  // 버튼 텍스트 변경
  const submitButton = document.querySelector('#review-form button[type="submit"]');
  submitButton.textContent = '후기 수정';

  // 폼으로 스크롤
  document.getElementById('review-form').scrollIntoView({ 
    behavior: 'smooth',
    block: 'center'
  });
}

async function deleteReview(reviewId) {
  if (!confirm('정말로 이 후기를 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`/reviews/${reviewId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    alert('후기가 삭제되었습니다.');
    userReview = null;
    
    // 폼 초기화
    document.getElementById('review-form').reset();
    resetStars();
    document.querySelector('#review-form button[type="submit"]').textContent = '후기 등록';

    // 후기 목록 새로고침
    const eventId = new URLSearchParams(window.location.search).get('id');
    await loadReviews(eventId);
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('후기 삭제 중 오류가 발생했습니다.');
  }
}

async function checkUserReview(eventId) {
  try {
    const response = await fetch(`/reviews/user-review?eventId=${eventId}`);
    if (response.ok) {
      userReview = await response.json();
      if (userReview) {
        // 기존 리뷰가 있으면 폼에 데이터 채우기
        document.getElementById('rating').value = userReview.rating;
        updateStars(userReview.rating);
        document.getElementById('comment').value = userReview.comment;
        document.getElementById('anonymous').checked = userReview.isAnonymous;

        // 제출 버튼 텍스트 변경
        const submitButton = document.querySelector('#review-form button[type="submit"]');
        submitButton.textContent = '후기 수정';
      }
    }
  } catch (error) {
    console.error('Error checking user review:', error);
  }
}
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
    } else {
      throw new Error('Failed to fetch user info');
    }
  } catch (error) {
    console.error('Error fetching current user ID:', error);
  }
}

async function checkUserReview(eventId) {
  try {
    const response = await fetch(`/reviews/user-review?eventId=${eventId}`);
    if (response.ok) {
      userReview = await response.json();
      if (userReview) {
        // 기존 리뷰가 있으면 폼에 데이터를 채워넣음
        document.getElementById('rating').value = userReview.rating;
        document.getElementById('comment').value = userReview.comment;
        document.getElementById('anonymous').checked = userReview.isAnonymous;
        
        // 제출 버튼 텍스트 변경
        const submitButton = document.querySelector('#review-form button[type="submit"]');
        submitButton.textContent = '리뷰 수정';
      }
    }
  } catch (error) {
    console.error('Error checking user review:', error);
  }
}

async function loadEventDetails(eventId) {
  try {
    const response = await fetch(`/events/${eventId}`);
    const event = await response.json();

    const participants = event.finalParticipants || [];
    
    if (!participants.includes(currentUserId)) {
      document.getElementById('review-form').style.display = 'none';
      document.getElementById('review-notice').textContent = '이벤트 참가자만 후기를 작성할 수 있습니다.';
      document.getElementById('review-notice').style.display = 'block';
    } else {
      document.getElementById('review-form').style.display = 'block';
      document.getElementById('review-notice').style.display = 'none';
    }

    document.getElementById('event-details').innerHTML = `
      <p>제목: ${event.title}</p>
      <p>장소: ${event.place}</p>
      <p>날짜: ${new Date(event.date).toLocaleDateString()}</p>
      <p>내용: ${event.contents}</p>
    `;
  } catch (error) {
    console.error('Error loading event details:', error);
    alert('이벤트 정보를 불러오는 중 문제가 발생했습니다.');
  }
}

async function loadReviews(eventId) {
  try {
    const response = await fetch(`/reviews?eventId=${eventId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load reviews');
    }

    const reviews = await response.json();
    document.getElementById('reviews-list').innerHTML = reviews.map(reviewToHtml).join('');
  } catch (error) {
    console.error('Error loading reviews:', error);
    alert('후기를 불러오는 중 문제가 발생했습니다: ' + error.message);
  }
}

function reviewToHtml(review) {
  const userName = review.isAnonymous ? '익명' : review.userId?.displayName || 'Unknown User';
  const createdAt = new Date(review.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isOwner = review.userId?._id === currentUserId;

  return `
    <div class="review">
      <p><strong>${userName}</strong> (${review.rating}점)</p>
      <p>${review.comment}</p>
      <p><em>${createdAt}</em></p>
      ${isOwner ? renderReviewActions(review._id) : ''}
    </div>
  `;
}

function renderReviewActions(reviewId) {
  return `
    <div class="review-actions">
      <button class="review-btn" onclick="deleteReview('${reviewId}')">삭제</button>
    </div>
  `;
}

async function submitReview(eventId) {
  const rating = document.getElementById('rating').value;
  const comment = document.getElementById('comment').value;
  const isAnonymous = document.getElementById('anonymous').checked;

  try {
    // userReview가 있고 _id도 있는 경우에만 PUT 요청
    const method = userReview && userReview._id ? 'PUT' : 'POST';
    const url = userReview && userReview._id ? `/reviews/${userReview._id}` : '/reviews';

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
    document.getElementById('review-form').reset();
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('후기 처리 중 오류가 발생했습니다: ' + error.message);
  }
}

async function deleteReview(reviewId) {
  if (!confirm('정말로 이 후기를 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert('후기가 성공적으로 삭제되었습니다.');
      userReview = null;
      const submitButton = document.querySelector('#review-form button[type="submit"]');
      submitButton.textContent = '후기 등록';
      document.getElementById('review-form').reset();
      await loadReviews(new URLSearchParams(window.location.search).get('id'));
    } else {
      const error = await response.json();
      alert(`후기 삭제 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('후기를 삭제하는 중 문제가 발생했습니다.');
  }
}
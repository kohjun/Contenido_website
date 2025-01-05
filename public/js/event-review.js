  let currentUserId;

  document.addEventListener('DOMContentLoaded', async () => {
      try {
        await fetchCurrentUserId(); // currentUserId를 먼저 가져옴
    
        const eventId = new URLSearchParams(window.location.search).get('id');
        if (!eventId) {
          alert('이벤트 ID가 없습니다.');
          return;
        }
    
        await loadEventDetails(eventId);
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

  async function loadEventDetails(eventId) {
      try {
        const response = await fetch(`/events/${eventId}`);
        const event = await response.json();
    
        // finalParticipants가 없을 경우 빈 배열로 초기화
        const participants = event.finalParticipants || [];
    
        if (!participants.includes(currentUserId)) {
          // 후기를 작성할 수 없는 경우
          document.getElementById('review-form').style.display = 'none';
        } else {
          // 후기를 작성할 수 있는 경우
          document.getElementById('review-form').style.display = 'block';
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
    
    
    function renderReviewActions(reviewId) {
      return `
        <button class="review-btn" onclick="deleteReview('${reviewId}')">삭제</button>
      `;
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
      const rating = review.rating || 'N/A';
      const comment = review.comment || 'No comment provided';

      // 작성 시각 포맷
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
          <p><strong>${userName}</strong> (${rating}점)</p>
          <p>${comment}</p>
          <p><em>${createdAt}</em></p> <!-- 작성 시각 표시 -->
          ${isOwner ? renderReviewActions(review._id) : ''}
      </div>
      `;
  }


  async function submitReview(eventId) {
      const rating = document.getElementById('rating').value;
      const comment = document.getElementById('comment').value;
      const isAnonymous = document.getElementById('anonymous').checked;
    
      try {
        const response = await fetch('/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, rating, comment, isAnonymous }),
        });
    
        if (response.ok) {
          alert('후기가 성공적으로 등록되었습니다.');
          document.getElementById('review-form').reset();
          await loadReviews(eventId);
        } else {
          const error = await response.json();
          alert(`후기 등록 실패: ${error.message}`);
        }
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('후기를 등록하는 중 문제가 발생했습니다.');
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
          await loadReviews(new URLSearchParams(window.location.search).get('id'));
        } else if (response.status === 404) {
          alert('삭제할 후기를 찾을 수 없습니다.');
        } else {
          const error = await response.json();
          alert(`후기 삭제 실패: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting review:', error);
        alert('후기를 삭제하는 중 문제가 발생했습니다.');
      }
    }
    

import { useState, useEffect } from 'react';

export const useEventReviews = (eventId) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    isAnonymous: false
  });

  useEffect(() => {
    if (eventId) {
      fetchReviews();
    }
  }, [eventId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/reviews?eventId=${eventId}`);
      if (!response.ok) throw new Error('리뷰를 불러오는데 실패했습니다');
      const data = await response.json();
      setReviews(data);
    } catch (err) {
      console.error('리뷰 로딩 오류:', err);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          rating: newReview.rating,
          comment: newReview.comment,
          isAnonymous: newReview.isAnonymous
        })
      });

      if (!response.ok) throw new Error('리뷰 작성에 실패했습니다');

      await fetchReviews();
      setNewReview({ rating: 5, comment: '', isAnonymous: false });
    } catch (err) {
      console.error('리뷰 작성 오류:', err);
    }
  };

  return {
    reviews,
    newReview,
    setNewReview,
    submitReview
  };
};
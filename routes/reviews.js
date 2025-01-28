// routes/review.js
const express = require('express');
const Review = require('../models/Review');
const Event = require('../models/Event');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// 한 이벤트의 모든 리뷰 확인
router.get('/', async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const reviews = await Review.find({ eventId })
      .populate('userId', 'displayName _id')
      .select('rating comment isAnonymous userId createdAt');

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// 새로운 리뷰 작성
router.post('/', authenticateToken, async (req, res) => {
  const { eventId, rating, comment, isAnonymous } = req.body;

  if (!eventId || !rating || !comment) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 참가자 여부 확인
    if (!event.finalParticipants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only participants can submit reviews' });
    }

    const review = new Review({
      userId: req.user.id,
      eventId,
      rating,
      comment,
      isAnonymous: !!isAnonymous
    });

    await review.save();

    // 이벤트의 모든 리뷰 가져오기 (방금 작성한 리뷰 포함)
    const allReviews = await Review.find({ eventId });
    
    // 평균 rating 계산
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;

    // 이벤트의 rating 업데이트
    event.rating = parseFloat(averageRating.toFixed(1)); // 소수점 첫째자리까지만 저장
    await event.save();

    res.status(201).json({ 
      message: 'Review submitted successfully',
      newRating: event.rating
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
});

// 리뷰 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    const eventId = review.eventId;

    // 리뷰 삭제
    await review.deleteOne();

    // 남은 리뷰들의 평균 rating 다시 계산
    const remainingReviews = await Review.find({ eventId });
    
    let newRating = 0;
    if (remainingReviews.length > 0) {
      const totalRating = remainingReviews.reduce((sum, review) => sum + review.rating, 0);
      newRating = parseFloat((totalRating / remainingReviews.length).toFixed(1));
    }

    // 이벤트의 rating 업데이트
    await Event.findByIdAndUpdate(eventId, { rating: newRating });

    res.status(200).json({ 
      message: 'Review deleted successfully',
      newRating: newRating
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
});

module.exports = router;
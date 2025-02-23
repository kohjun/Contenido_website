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

// 사용자가 이벤트에 대한 리뷰를 이미 작성했는지 확인
router.get('/user-review', authenticateToken, async (req, res) => {
  const { eventId } = req.query;
  
  try {
    const existingReview = await Review.findOne({
      eventId,
      userId: req.user.id
    });
    
    res.json(existingReview || null);
  } catch (error) {
    res.status(500).json({ message: 'Error checking user review', error: error.message });
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

    // 이미 리뷰를 작성했는지 확인
    const existingReview = await Review.findOne({
      eventId,
      userId: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already submitted a review for this event' });
    }

    const review = new Review({
      userId: req.user.id,
      eventId,
      rating,
      comment,
      isAnonymous: !!isAnonymous
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
});

// 리뷰 수정
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment, isAnonymous } = req.body;

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // 리뷰 작성자 확인
    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own reviews' });
    }

    // 리뷰 수정
    review.rating = rating;
    review.comment = comment;
    review.isAnonymous = isAnonymous;
    await review.save();

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Error updating review', error: error.message });
  }
});

// 리뷰 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await review.deleteOne();
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
});

module.exports = router;
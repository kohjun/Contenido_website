const express = require('express');
const Review = require('../models/Review');
const Event = require('../models/Event');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Get reviews for an event
router.get('/', async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const reviews = await Review.find({ eventId })
      .populate('userId', 'displayName _id') // 필요한 필드만 반환
      .select('rating comment isAnonymous userId createdAt'); // 필요한 필드만 반환

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// Submit a new review
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

    // 이벤트 참가자 확인 (복구)
    if (!event.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only participants can submit reviews' });
    }

    const review = new Review({
      userId: req.user.id,
      eventId,
      rating,
      comment,
      isAnonymous: !!isAnonymous, // Ensure it's boolean
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
});



// Delete a review
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log(`Delete request for review ID: ${req.params.id}`); // 요청 ID 로깅

  const { id } = req.params;

  try {
    const review = await Review.findById(id);
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

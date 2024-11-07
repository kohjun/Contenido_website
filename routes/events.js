// routes/events.js
const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

// GET 요청

// Get all events
// routes/events.js
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isEnded: false }).populate('creator', 'displayName email'); 
    // 'displayName email'은 반환하고자 하는 사용자 정보 필드 (선택사항)
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
});


// Get participation status for all events
router.get('/participants/status', async (req, res) => {
  try {
    const events = await Event.find({}).populate('participants');
    const participantsStatus = events.map(event => ({
      eventId: event._id,
      survived: event.resultReport?.participants || [],
      eliminated: event.participants.filter(
        p => !(event.resultReport?.participants || []).includes(p._id)
      ),
    }));
    res.json(participantsStatus);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching participant status', error });
  }
});

// Get a specific event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event', error });
  }
});

// POST 요청

// Create a new event
router.post('/', authenticateToken, async (req, res) => {
  const { title, date, place, participants, startTime, endTime, participation_fee, contents } = req.body;

  try {
    const event = new Event({
      title,
      date,
      place,
      participants,
      startTime,
      endTime,
      participation_fee,
      contents,
      creator: req.user.id, // Set creator from the authenticated user
    });

    await event.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});


// Submit event participation report (consolidated)
router.post('/:id/report', authenticateToken, async (req, res) => {
  const { week, participants } = req.body;

  if (!week || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ message: 'Invalid input: week or participants missing' });
  }

  try {
    const updates = participants.map(participantId =>
      User.findByIdAndUpdate(participantId, {
        [`status.week${week}`]: 'O',
      })
    );
    await Promise.all(updates);
    res.status(200).json({ message: 'Report updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating report', error });
  }
});

async function findEventById(eventId, res, throwError = false) {
  const event = await Event.findById(eventId);
  if (!event && throwError) {
    throw new Error('Event not found');
  } else if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  return event;
}

// Mark an event as ended
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const event = await findEventById(req.params.id, res);
    if (!event) return;

    event.isEnded = true;
    await event.save();
    res.status(200).json({ message: 'Event marked as ended' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking event as ended', error });
  }
});

// DELETE 요청

// Cancel an event
// Cancel an event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const user = await User.findById(req.user.id);

    // Check if user is both the creator and has staff role
    if (event.creator.toString() !== req.user.id || user.role !== 'staff') {
      return res.status(403).json({ message: 'You are not authorized to cancel this event' });
    }

    await event.deleteOne();
    res.status(200).json({ message: 'Event canceled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error canceling event', error });
  }
});


module.exports = router;

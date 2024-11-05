const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
// Placeholder for future authentication middleware
// const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
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

// Submit event participation report
router.post('/:id/report', async (req, res) => {
  const eventId = req.params.id;
  const { participants } = req.body; // Expect array of participant IDs

  try {
    await Event.findByIdAndUpdate(eventId, {
      resultReport: { participants },
    });
    res.status(200).json({ message: 'Report updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating report', error });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  const { title, date, place, participants, startTime, endTime, participation_fee, contents } = req.body;

  try {
    const event = new Event({ title, date, place, participants, startTime, endTime, participation_fee, contents });
    await event.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error });
  }
});


// Get all verified users
router.get('/participants/users', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true });

    // Return only the necessary fields
    const userData = users.map(user => ({
      id: user._id,
      displayName: user.displayName,
      profileImage: user.profileImage,
    }));

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// Get participation status for all events
router.get('/participants/status', async (req, res) => {
  try {
    const events = await Event.find({}).populate('participants');

    // Calculate survived and eliminated participants per event
    const participantsStatus = events.map(event => ({
      eventId: event._id,
      survived: event.resultReport.participants,
      eliminated: event.participants.filter(
        p => !event.resultReport.participants.includes(p._id)
      ),
    }));

    res.json(participantsStatus);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching participant status', error });
  }
});

module.exports = router;

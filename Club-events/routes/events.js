const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
// Placeholder for future authentication middleware
// const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Get events for the next two months
router.get('/', async (req, res) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  try {
    const events = await Event.find({ date: { $gte: twoMonthsAgo } });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
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

// Create a new event (restricted to staff in the future)
router.post('/', async (req, res) => {
  // Placeholder for future role-based authorization
  // if (req.user && req.user.role === 'staff') {
  const { title, date } = req.body;

  try {
    const event = new Event({ title, date });
    await event.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error });
  }
  // } else {
  //     res.status(403).json({ message: 'Forbidden' });
  // }
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

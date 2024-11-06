//routes/events.js
const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');


// GET 요청

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


// POST 요청

// Submit event participation report (consolidated)
router.post('/:id/report', async (req, res) => {
  const { week, participants } = req.body;

  try {
    // Update each participant's status for the chosen week to "O"
    const updates = participants.map(participantId => 
      User.findByIdAndUpdate(participantId, {
        [`status.week${week}`]: 'O' // Dynamically update the specific week field
      })
    );

    // Execute all updates in parallel
    await Promise.all(updates);

    res.status(200).json({ message: 'Report updated successfully' });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Error updating report', error });
  }
});

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
    console.error("Error creating event:", error);
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});





 //DELETE 요청

// Cancel an event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log("Event creator ID:", event.creator); // Log event creator ID
    console.log("Authenticated user ID:", req.user.id); // Log authenticated user ID

    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to cancel this event' });
    }

    await event.deleteOne();
    res.status(200).json({ message: 'Event canceled successfully' });
  } catch (error) {
    console.error('Error canceling event:', error);
    res.status(500).json({ message: 'Error canceling event', error });
  }
});







module.exports = router;

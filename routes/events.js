// routes/events.js
const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Review = require('../models/review');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

// GET 요청 //


// 모든 이벤트 확인하기
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isEnded: false }).populate('creator', 'displayName email'); 
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
}); 


// 모든 이벤트에 대한 참가자 상태 확인 하기
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

// 종료된 이벤트 확인하기
router.get('/ended', async (req, res) => {
  try {
    const endedEvents = await Event.find({ isEnded: true }); 
    res.json(endedEvents); 
  } catch (error) {
    console.error('Error fetching ended events:', error.message);
    res.status(500).json({
      message: 'Error fetching ended events',
      error: error.message,
    });
  }
});





// 특정 이벤트 확인하기
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('creator', '_id');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event', error });
  }
});

// POST 요청 //


// 새로운 이벤트 만들기
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
      creator: req.user.id, // Ensure this is correctly set
    });

    await event.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});



// 결과 보고서 제출
router.post('/:id/report', authenticateToken, async (req, res) => {
  const { week, participants } = req.body;

  if (!week || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ message: 'Invalid input: week or participants missing' });
  }

  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }


    event.finalParticipants = participants.map(String); 
    event.isEnded = true; 
    await event.save();

    const updates = participants.map(participantId =>
      User.findByIdAndUpdate(participantId, {
        [`status.week${week}`]: 'O',
      })
    );
    await Promise.all(updates);

    res.status(200).json({ message: 'Report submitted and event marked as ended' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Error submitting report', error: error.message });
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

// 이벤트 종료하기
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

// 이벤트 신청하기
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 모집 마감 확인
    if (new Date() > event.applicationDeadline) {
      return res.status(400).json({ message: 'Application period has ended' });
    }

    // 중복 신청 확인
    if (event.appliedParticipants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already applied' });
    }

    // 모집 인원 초과 확인
    if (event.appliedParticipants.length >= event.participants) {
      return res.status(400).json({ message: 'Event is already full' });
    }

    // 신청자 추가
    event.appliedParticipants.push(req.user.id);
    await event.save();

    res.status(200).json({ message: 'Application successful' });
  } catch (error) {
    console.error('Error applying for event:', error);
    res.status(500).json({ message: 'Error applying for event', error });
  }
});






// DELETE 요청 //


// 이벤트 삭제하기
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log('Logged-in User ID:', req.user.id);
    console.log('Event Creator ID:', event.creator);

    // Check if user is the creator or has the staff role
    if (event.creator.toString() !== req.user.id && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'You are not authorized to cancel this event' });
    }

    await event.deleteOne();
    res.status(200).json({ message: 'Event canceled successfully' });
  } catch (error) {
    console.error('Error canceling event:', error);
    res.status(500).json({ message: 'Error canceling event', error });
  }
});





// PUT 요청

// 이벤트 내용 수정하기
router.put('/update-content', authenticateToken, async (req, res) => {
  const { eventId, title, place, date, participants, startTime, endTime, participation_fee, contents } = req.body;

  if (!eventId) {
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    
    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this event' });
    }

    
    event.title = title || event.title;
    event.place = place || event.place;

    
    if (date) {
      event.date = new Date(date);
    }

    event.participants = participants || event.participants;
    event.startTime = startTime || event.startTime;
    event.endTime = endTime || event.endTime;
    event.participation_fee = participation_fee || event.participation_fee;
    event.contents = contents || event.contents;

    console.log('Updated Event:', event); 

    await event.save();
    res.status(200).json({ message: 'Event content updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event content', error });
  }
});






module.exports = router;
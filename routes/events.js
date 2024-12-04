// routes/events.js
const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Review = require('../models/Review');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

// GET 요청

// Get all events
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

router.get('/ended', async (req, res) => {
  try {
    const endedEvents = await Event.find({ isEnded: true }); // 종료된 이벤트 검색
    res.json(endedEvents); // 정상적으로 데이터를 반환
  } catch (error) {
    console.error('Error fetching ended events:', error.message); // 로그 개선
    res.status(500).json({
      message: 'Error fetching ended events',
      error: error.message,
    });
  }
});





// Get a specific event by ID
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


router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 스태프 권한 확인
    if (event.creator !== req.user.id && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Unauthorized to view participants' });
    }

    // 각 참가자의 데이터를 User 모델에서 개별 조회
    const participants = await Promise.all(
      event.appliedParticipants.map(async participantId => {
        const user = await User.findById(participantId).select('name gender phonenumber');
        return user
          ? { name: user.name, gender: user.gender, phonenumber: user.phonenumber }
          : { name: 'Unknown', gender: 'No Gender', phonenumber : 'Unknown' }; // 사용자 정보가 없는 경우 기본값
      })
    );

    res.json({
      title: event.title,
      date: event.date,
      participants
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Internal server error', error });
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
      creator: req.user.id, // Ensure this is correctly set
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
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 최종 참가자 목록에 String 값으로 추가
    event.finalParticipants = participants.map(String); // String으로 변환하여 저장
    event.isEnded = true; // 이벤트 종료 설정
    await event.save();

    // User 스키마의 주차별 참여 상태 업데이트
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

// 이벤트 신청하기
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 모집 인원 초과 확인
    if (event.appliedParticipants.length >= event.participants) {
      return res.status(400).json({ message: 'Event is already full' });
    }

    // 중복 신청 확인
    if (event.appliedParticipants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already applied' });
    }

    // 신청 추가
    event.appliedParticipants.push(req.user.id);
    await event.save();

    res.status(200).json({ message: 'Application successful' });
  } catch (error) {
    console.error('Error applying for event:', error);
    res.status(500).json({ message: 'Error applying for event', error });
  }
});

//이벤트 신청 취소하기
router.post('/:id/cancel-application', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 신청 여부 확인
    if (!event.appliedParticipants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have not applied for this event' });
    }

    // 신청 제거
    event.appliedParticipants = event.appliedParticipants.filter(
      participant => participant.toString() !== req.user.id
    );
    await event.save();

    res.status(200).json({ message: 'Application canceled successfully' });
  } catch (error) {
    console.error('Error canceling application:', error);
    res.status(500).json({ message: 'Error canceling application', error });
  }
});


// DELETE 요청

// Cancel an event
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

// Update event content using PUT
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

    // 현재 사용자가 이벤트 생성자인지 확인
    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this event' });
    }

    // 필드 업데이트
    event.title = title || event.title;
    event.place = place || event.place;

    // 날짜는 Date 객체로 변환
    if (date) {
      event.date = new Date(date);
    }

    event.participants = participants || event.participants;
    event.startTime = startTime || event.startTime;
    event.endTime = endTime || event.endTime;
    event.participation_fee = participation_fee || event.participation_fee;
    event.contents = contents || event.contents;

    console.log('Updated Event:', event); // 디버깅: 업데이트된 이벤트 데이터 확인

    await event.save();
    res.status(200).json({ message: 'Event content updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event content', error });
  }
});






module.exports = router;
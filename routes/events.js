const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Review = require('../models/Review');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles, requireActiveUser } = require('../middleware/roleMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/events')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB 제한
    files: 3 // 최대 3개 파일
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('2MB이하의 이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});


// GET 요청
// 모든 이벤트 확인 - 인증 불필요
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isEnded: false }).populate('creator', 'displayName email');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
});

// 캘린더용 이벤트 포맷 - 인증 불필요
router.get('/calendar', async (req, res) => {
  try {
    // 먼저 이벤트 데이터를 로깅
    const events = await Event.find({ isEnded: false });
    console.log('Found events:', events);

    // populate 전에 events가 제대로 있는지 확인
    if (!events) {
      return res.status(404).json({ message: 'No events found' });
    }

    const populatedEvents = await Event.find({ isEnded: false })
      .populate('creator', 'displayName email')
      .populate('appliedParticipants', 'displayName');
    
    console.log('Populated events:', populatedEvents);  // 데이터 확인용 로깅

    const calendarEvents = populatedEvents.map(event => {
      console.log('Processing event:', event); // 각 이벤트 처리 과정 로깅
      
      return {
        id: event._id,
        calendarId: 'cal1',
        title: event.title,
        body: event.contents,
        location: event.place,
        start: `${event.date.toISOString().split('T')[0]}T${event.startTime}`,
        end: `${event.date.toISOString().split('T')[0]}T${event.endTime}`,
        category: 'time',
        isReadOnly: true,
        state: event.appliedParticipants?.length >= event.participants ? '마감' : '모집중',
        attendees: [event.participants],
        isVisible: true,
        backgroundColor: event.appliedParticipants?.length >= event.participants ? '#FF6B6B' : '#03bd9e',
        dragBackgroundColor: event.appliedParticipants?.length >= event.participants ? '#FF6B6B' : '#03bd9e',
        borderColor: event.appliedParticipants?.length >= event.participants ? '#FF6B6B' : '#03bd9e',
        raw: {
          participation_fee: event.participation_fee,
          current: event.appliedParticipants?.length || 0,
          max: event.participants
        }
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Detailed error in calendar route:', error);
    res.status(500).json({ 
      message: 'Error fetching calendar events', 
      error: error.message,
      stack: error.stack 
    });
  }
});


// 종료된 이벤트 정보 확인 - officer,participant,starter 접근 가능
router.get('/ended', 
  authenticateToken,
  authorizeRoles('officer','participant','starter','admin'),
  async (req, res) => {
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

// 특정 이벤트 정보 확인 - 인증 불필요
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

// 참가자 정보 확인 - 이벤트 생성자&& officer만 접근 가능
router.get('/:id/participants', 
  authenticateToken,
  authorizeRoles('officer','admin'),
    async (req, res) => {
        try {
            const event = await Event.findById(req.params.id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // creator 체크
            if (event.creator.toString() !== req.user.id) {
                return res.status(403).json({ 
                    message: 'Only event creator can access participants info' 
                });
            }

            const participants = await Promise.all(
                event.appliedParticipants.map(async participantId => {
                    const user = await User.findById(participantId).select('name gender phonenumber');
                    return user
                        ? { name: user.name, gender: user.gender, phonenumber: user.phonenumber }
                        : { name: 'Unknown', gender: 'No Gender', phonenumber: 'Unknown' };
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
    }
);

// POST 요청
// 새로운 이벤트 등록 - officer만 가능
router.post('/', 
  authenticateToken,
  authorizeRoles('officer','admin'),
  async (req, res) => {
    if (req.user.department !== 'operation' && req.user.department !== 'planning') {
      return res.status(403).json({
        message: '기획부,운영부만 이벤트 생성이 가능합니다.' 
      });
    }
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
        creator: req.user.id,
      });

      await event.save();
      res.status(201).json({ message: 'Event created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error creating event', error: error.message });
    }
});

// 이벤트 결과 보고서 제출 - /officer/planning 가능
router.post('/:id/report', 
  authenticateToken,
  authorizeRoles('officer','admin'),
  async (req, res) => {
    const { participants } = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'Invalid input: participants missing' });
    }

    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // 이벤트 상태 업데이트
      event.finalParticipants = participants.map(String);
      event.isEnded = true;
      await event.save();

      // 참가자들의 participationCount 증가
      const updates = participants.map(participantId =>
        User.findByIdAndUpdate(participantId, {
          $inc: {
            'participationCount.regularCount': 1  // regularCount 증가
          }
        })
      );
      await Promise.all(updates);

      res.status(200).json({ message: 'Report submitted and event marked as ended' });
    } catch (error) {
      console.error('Error submitting report:', error);
      res.status(500).json({ message: 'Error submitting report', error: error.message });
    }
});

// 이벤트 신청 - active 상태인 participant,starter,officer 가능
router.post('/:id/apply', 
  authenticateToken,
  requireActiveUser,
  authorizeRoles('participant', 'starter', 'officer','admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (event.appliedParticipants.length >= event.participants) {
        return res.status(400).json({ message: 'Event is already full' });
      }

      if (event.appliedParticipants.includes(req.user.id)) {
        return res.status(400).json({ message: 'You have already applied' });
      }

      event.appliedParticipants.push(req.user.id);
      await event.save();

      res.status(200).json({ message: 'Application successful' });
    } catch (error) {
      console.error('Error applying for event:', error);
      res.status(500).json({ message: 'Error applying for event', error });
    }
});

// 이벤트 신청 취소 - 'participant','starter','officer' 가능
router.post('/:id/cancel-application', 
  authenticateToken,
  authorizeRoles('participant','starter','officer','admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (!event.appliedParticipants.includes(req.user.id)) {
        return res.status(400).json({ message: 'You have not applied for this event' });
      }

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

// 이미지 업로드 라우트 추가
// routes/events.js
// 이미지 업로드 라우터도 수정
router.post('/upload-images',
  authenticateToken,
  authorizeRoles('officer','admin'),
  upload.array('images', 3), // 최대 3개
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: '업로드된 이미지가 없습니다.' });
      }

      const eventId = req.body.eventId;
      const event = await Event.findById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      // 이벤트 생성자 확인
      if (event.creator.toString() !== req.user.id) {
        return res.status(403).json({ 
          message: '이벤트 생성자만 이미지를 업로드할 수 있습니다.' 
        });
      }

      // 새로운 이미지 URL 생성
      const newImages = req.files.map(file => `/uploads/events/${file.filename}`);

      res.json({ 
        message: '이미지가 성공적으로 업로드되었습니다.',
        images: newImages 
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({ message: '이미지 업로드 중 오류가 발생했습니다.' });
    }
});

// DELETE 요청
// 이벤트 삭제 - 생성자 && officer만 가능
router.delete('/:id', 
  authenticateToken,
  authorizeRoles('officer','admin'),
    async (req, res) => {
        try {
            const event = await Event.findById(req.params.id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // creator 체크
            if (event.creator.toString() !== req.user.id) {
                return res.status(403).json({ 
                    message: 'Only event creator can delete this event' 
                });
            }

            await event.deleteOne();
            res.status(200).json({ message: 'Event canceled successfully' });
        } catch (error) {
            console.error('Error canceling event:', error);
            res.status(500).json({ message: 'Error canceling event', error });
        }
    }
);

// PUT 요청
// 이벤트 내용 수정 - 생성자 && officer만 가능
router.put('/update-content', 
  authenticateToken,
  authorizeRoles('officer','admin'),
  async (req, res) => {
    const { eventId, currentImages, newImages, deletedImages, ...updatedData } = req.body;

    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      // creator 체크
      if (event.creator.toString() !== req.user.id) {
        return res.status(403).json({ 
          message: '이벤트 생성자만 수정할 수 있습니다.' 
        });
      }

      // 삭제된 이미지 처리
      if (deletedImages && deletedImages.length > 0) {
        // 파일 시스템에서 이미지 삭제
        for (const imagePath of deletedImages) {
          const fullPath = path.join(__dirname, '..', 'public', imagePath);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
          }
        }
      }

      // 이미지 배열 업데이트
      let finalImages = [];
      
      // 삭제되지 않은 기존 이미지 추가
      if (currentImages) {
        finalImages = [...currentImages];
      }
      
      // 새로 업로드된 이미지 추가
      if (newImages) {
        finalImages = [...finalImages, ...newImages];
      }

      // 최대 3개 제한 확인
      if (finalImages.length > 3) {
        return res.status(400).json({ message: '이미지는 최대 3개까지만 허용됩니다.' });
      }

      // 이벤트 업데이트
      event.images = finalImages;
      
      // 나머지 필드 업데이트
      Object.keys(updatedData).forEach(key => {
        event[key] = updatedData[key];
      });

      await event.save();
      res.status(200).json({ 
        message: '이벤트가 성공적으로 수정되었습니다.',
        event 
      });

    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ 
        message: '이벤트 수정 중 오류가 발생했습니다.',
        error: error.message 
      });
    }
});


module.exports = router;
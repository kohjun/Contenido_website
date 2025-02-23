const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles, requireActiveUser } = require('../middleware/roleMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/events');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 3
  },
  fileFilter: function(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('지원하지 않는 파일 형식입니다.'), false);
    }
    cb(null, true);
  }
});

// Multer 에러 핸들링 미들웨어
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '파일 크기는 2MB를 초과할 수 없습니다.' });
    }
    return res.status(400).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
  }
  next(err);
};


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
    // populate 전에 events가 제대로 있는지 확인
    if (!events) {
      return res.status(404).json({ message: 'No events found' });
    }

    const populatedEvents = await Event.find({ isEnded: false })
      .populate('creator', 'displayName email')
      .populate('appliedParticipants', 'displayName');
    
    const calendarEvents = populatedEvents.map(event => {
      
      return {
      id: event._id,
      calendarId: event.team === 'R' ? 'cal2' : 'cal1',
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
  authorizeRoles('officer','participant','starter','admin','guest'),
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
      const event = await Event.findById(req.params.id)
        .populate({
          path: 'appliedParticipants.userId',
          select: 'name displayName gender phonenumber'
        });

      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }
      

      // 참가자 데이터 포맷팅
      const participants = event.appliedParticipants.map(participant => ({
        userId: participant.userId._id,
        name: participant.userId.name,
        displayName: participant.userId.displayName,
        gender: participant.userId.gender,
        phonenumber: participant.userId.phonenumber,
        status: participant.status,
        appliedAt: participant.appliedAt
      }));

      res.json({
        title: event.title,
        date: event.date,
        participants
      });
    } catch (error) {
      console.error('Error fetching participants:', error);
      res.status(500).json({ message: 'Error fetching participants' });
    }
});

// POST 요청
// 새로운 이벤트 등록
router.post('/', 
  authenticateToken,
  authorizeRoles('officer','admin'),
  upload.array('images', 3),
  handleMulterError,
  async (req, res) => {
    try {
      if (req.user.department !== 'planning') {
        return res.status(403).json({
          message: '기획부만 이벤트 생성이 가능합니다.'
        });
      }

      const {
        title,
        date,
        place,
        participants,
        startTime,
        endTime,
        participation_fee,
        contents,
        team,
        accessCode
      } = req.body;

      // 입력값 검증
      if (!title || !date || !place || !participants || !startTime || 
          !endTime || !participation_fee || !contents || !team || !accessCode) {
        return res.status(400).json({ message: '모든 필수 필드를 입력해주세요.' });
      }

      // 접근 코드 유효성 검사
      if (!/^\d{4}$/.test(accessCode)) {
        return res.status(400).json({ message: '접근 코드는 4자리 숫자여야 합니다.' });
      }

      const images = req.files ? req.files.map(file => `/uploads/events/${file.filename}`) : [];

      const event = new Event({
        title,
        date,
        place,
        participants: parseInt(participants),
        startTime,
        endTime,
        participation_fee: parseInt(participation_fee),
        contents,
        team,
        accessCode, // 직접 accessCode 필드에 저장
        images,
        creator: req.user.id
      });

      await event.save();
      
      res.status(201).json({ message: '이벤트가 성공적으로 등록되었습니다.' });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ 
        message: '이벤트 생성 중 오류가 발생했습니다.',
        error: error.message 
      });
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
// 이벤트 접근 코드 확인
router.post('/:id/verify-access', authenticateToken, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const isValid = await event.verifyAccessCode(accessCode);
    if (!isValid) {
      return res.status(403).json({ message: '잘못된 접근 코드입니다.' });
    }

    // 세션에 접근 권한 저장
    req.session.eventAccess = req.session.eventAccess || {};
    req.session.eventAccess[req.params.id] = true;
    
    res.json({ message: '접근이 승인되었습니다.' });
  } catch (error) {
    console.error('Error verifying access code:', error);
    res.status(500).json({ message: '접근 코드 확인 중 오류가 발생했습니다.' });
  }
});


// 이벤트 신청 - active 상태인 participant,starter,officer 가능
router.post('/:id/apply', 
  authenticateToken,
  requireActiveUser,
  authorizeRoles('participant', 'starter', 'officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // 정원 초과 확인
      if (event.appliedParticipants.length >= event.participants) {
        return res.status(400).json({ message: 'Event is already full' });
      }

      // 이미 신청했는지 확인
      if (event.appliedParticipants.some(p => p.userId.toString() === req.user.id)) {
        return res.status(400).json({ message: 'You have already applied' });
      }

      // 새로운 참가자 추가
      event.appliedParticipants.push({
        userId: req.user.id,
        appliedAt: new Date()
      });
      
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

      // 신청 여부 확인
      const participantIndex = event.appliedParticipants.findIndex(
        p => p.userId.toString() === req.user.id
      );

      if (participantIndex === -1) {
        return res.status(400).json({ message: 'You have not applied for this event' });
      }

      // 참가자 제거
      event.appliedParticipants.splice(participantIndex, 1);
      await event.save();

      res.status(200).json({ message: 'Application canceled successfully' });
    } catch (error) {
      console.error('Error canceling application:', error);
      res.status(500).json({ message: 'Error canceling application', error });
    }
});

// 참가 신청 승인/거절
router.post('/:eventId/participants/:userId/status', 
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const { status } = req.body; // 'approved' 또는 'rejected'

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // 이벤트 생성자 확인
      if (event.creator.toString() !== req.user.id) {
        return res.status(403).json({ 
          message: 'Only event creator can approve/reject participants' 
        });
      }

      const participantIndex = event.appliedParticipants.findIndex(
        p => p.userId.toString() === userId
      );

      if (participantIndex === -1) {
        return res.status(404).json({ message: 'Participant not found' });
      }

      if (status === 'approved') {
        event.appliedParticipants[participantIndex].status = 'approved';
      } else if (status === 'rejected') {
        // 거절된 참가자는 배열에서 제거
        event.appliedParticipants.splice(participantIndex, 1);
      }

      await event.save();
      res.json({ message: `Participant ${status} successfully` });
    } catch (error) {
      console.error('Error updating participant status:', error);
      res.status(500).json({ message: 'Error updating participant status' });
    }
});

// 이미지 업로드 라우트 추가
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
  authorizeRoles('officer' , 'admin'),
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
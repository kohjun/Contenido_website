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
router.get('/kakao-key', (req, res) => {
  res.json({ kakaoKey: process.env.KAKAO_JAVASCRIPT_KEY });
});

module.exports = router;


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
      
      const approvedCount = event.appliedParticipants.filter(p => p.status === 'approved').length;
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
        state: approvedCount >= event.participants ? '마감' : '모집중',
        attendees: [event.participants],
        isVisible: true,
        backgroundColor: approvedCount >= event.participants ? '#FF6B6B' : '#03bd9e',
        dragBackgroundColor: approvedCount >= event.participants ? '#FF6B6B' : '#03bd9e',
        borderColor: approvedCount >= event.participants ? '#FF6B6B' : '#03bd9e',
        raw: {
          participation_fee: event.participation_fee,
          current: approvedCount,
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
      const Review = require('../models/Review'); // Review 모델 추가

      // 모든 종료된 이벤트 가져오기
      const endedEvents = await Event.find({ isEnded: true });
      
      // 각 이벤트에 대한 리뷰 정보를 가져와서 평균 평점 계산
      const eventsWithReviews = await Promise.all(endedEvents.map(async (event) => {
        const reviews = await Review.find({ eventId: event._id });
        const ratings = reviews.map(review => review.rating);
        const averageRating = ratings.length > 0 
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : 0;

        return {
          ...event.toObject(),
          rating: averageRating,
          ratingCount: reviews.length
        };
      }));

      res.json(eventsWithReviews);
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
          select: 'name displayName gender phonenumber birthDate role team' // birthDate와 role 추가
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
        appliedAt: participant.appliedAt,
        answers: participant.answers,
        birthDate: participant.userId.birthDate, // birthDate 추가
        role: participant.userId.role,
        team : participant.userId.team,
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

// 승인된 참가자 목록 가져오기
router.get('/:id/approved-participants', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'appliedParticipants.userId',
        select: 'name phonenumber'
      });

    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const approvedParticipants = event.appliedParticipants
      .filter(p => p.status === 'approved')
      .map(p => ({
        id: p.userId._id,
        name: p.userId.name,
        phonenumber: p.userId.phonenumber,
        displayName: `${p.userId.name}${p.userId.phonenumber ? p.userId.phonenumber.slice(-4) : ''}`
      }));

    res.json(approvedParticipants);
  } catch (error) {
    console.error('Error fetching approved participants:', error);
    res.status(500).json({ message: '승인된 참가자 목록을 가져오는 중 오류가 발생했습니다.' });
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
      // admin이거나 planning 부서인 경우에만 이벤트 생성 가능
      if (req.user.role !== 'admin' && req.user.department !== 'planning') {
        return res.status(403).json({
          message: '기획부 또는 관리자만 이벤트 생성이 가능합니다.'
        });
      }

      const { 
        title, date, place, participants, startTime, endTime, 
        participation_fee, contents, team, accessCode, hasParticipantRules, refundPolicy, refundCustomDescription
      } = req.body;

      const eventData = {
        title,
        date,
        place,
        participants: parseInt(participants),
        startTime,
        endTime,
        participation_fee: parseInt(participation_fee),
        contents,
        team,
        accessCode,
        images: req.files ? req.files.map(file => `/uploads/events/${file.filename}`) : [],
        creator: req.user.id,
        isSelective: req.body.isSelective === 'true',
        refundPolicy: refundPolicy || 'standard',
        refundCustomDescription: refundPolicy === 'custom' ? refundCustomDescription : undefined,
        additionalQuestions: req.body.isSelective === 'true' && req.body.additionalQuestions ? 
          JSON.parse(req.body.additionalQuestions) : [],
        hasParticipantRules: hasParticipantRules === 'true'
      };

      // 입력값 검증
      if (!title || !date || !place || !participants || !startTime || 
          !endTime || !participation_fee || !contents || !team || !accessCode) {
        return res.status(400).json({ message: '모든 필수 필드를 입력해주세요.' });
      }
      if (refundPolicy === 'custom' && !refundCustomDescription?.trim()) {
        return res.status(400).json({ 
          message: '커스텀 환불 정책에 대한 설명을 입력해주세요.' 
        });
      }

      // 접근 코드 유효성 검사
      if (!/^\d{4}$/.test(accessCode)) {
        return res.status(400).json({ message: '접근 코드는 4자리 숫자여야 합니다.' });
      }

      const event = new Event(eventData);
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
  authorizeRoles('participant', 'starter', 'officer', 'admin'),
  requireActiveUser, 
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      // 이미 지난 이벤트인지 확인
      if (event.isEnded) {
        return res.status(400).json({ message: '이미 종료된 이벤트입니다.' });
      }

      // 정원 초과 확인 (대기자 신청 허용을 위해 이 부분 주석 처리 또는 제거)
      // const approvedCount = event.appliedParticipants.filter(p => p.status === 'approved').length;
      // if (approvedCount >= event.participants) {
      //   return res.status(400).json({ message: '이미 정원이 다 찼습니다.' });
      // }

      // 이미 신청했는지 확인
      if (event.appliedParticipants.some(p => p.userId.toString() === req.user.id)) {
        return res.status(400).json({ message: '이미 신청한 이벤트입니다.' });
      }

      const participantData = {
        userId: req.user.id,
        appliedAt: new Date(),
        status: 'pending'
      };

      // 선별적 이벤트인 경우 답변 처리
      if (event.isSelective && event.additionalQuestions.length > 0) {
        if (!req.body.answers) {
          return res.status(400).json({ message: '지원서 답변이 필요합니다.' });
        }

        // 답변 수가 질문 수와 일치하는지 확인
        if (req.body.answers.length !== event.additionalQuestions.length) {
          return res.status(400).json({ message: '모든 질문에 답변해주세요.' });
        }

        // 답변이 비어있는지 확인
        if (req.body.answers.some(answer => !answer.answerText.trim())) {
          return res.status(400).json({ message: '비어있는 답변이 있습니다.' });
        }

        participantData.answers = req.body.answers;
      }

      event.appliedParticipants.push(participantData);
      await event.save();

      res.json({ 
        message: '신청이 완료되었습니다. 승인을 기다려주세요.'
      });
    } catch (error) {
      console.error('Error applying for event:', error);
      res.status(500).json({ 
        message: '이벤트 신청 중 오류가 발생했습니다.',
        error: error.message 
      });
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
      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );

      if (!participant) {
        return res.status(400).json({ message: 'You have not applied for this event' });
      }

      // 참가자 제거 (경고 부여 없이)
      event.appliedParticipants = event.appliedParticipants.filter(
        p => p.userId.toString() !== req.user.id
      );
      await event.save();

      res.status(200).json({ message: '신청이 취소되었습니다.' });

    } catch (error) {
      console.error('Error canceling application:', error);
      res.status(500).json({ message: '신청 취소 중 오류가 발생했습니다.', error });
    }
});


// 참가 신청 승인/거절
router.post('/:eventId/participants/:userId/status', 
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const { status } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      // 승인 시 정원 확인
      if (status === 'approved') {
        const approvedCount = event.appliedParticipants.filter(
          p => p.status === 'approved'
        ).length;

        if (approvedCount >= event.participants) {
          return res.status(400).json({ message: '이미 정원이 다 찼습니다.' });
        }
      }

      // 상태 변경 기록을 위한 로그 추가
      if (!participant.statusHistory) {
        participant.statusHistory = [];
      }

      // 이전 상태 기록
      const previousStatus = participant.status || 'pending';
      participant.statusHistory.push({
        previousStatus,
        newStatus: status,
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name // 사용자 이름도 함께 저장
      });

      participant.status = status;
      await event.save();

      res.json({ message: '참가자 상태가 업데이트되었습니다.' });
    } catch (error) {
      console.error('Error updating participant status:', error);
      res.status(500).json({ message: '상태 업데이트 중 오류가 발생했습니다.' });
    }
  }
);

// 새로운 라우트: 참가자 상태를 pending으로 되돌리기
router.post('/:eventId/participants/:userId/reset-status', 
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      // pending 상태가 아닌 경우에만 되돌리기 허용
      if (participant.status === 'pending') {
        return res.status(400).json({ message: '이미 대기 상태입니다.' });
      }

      // 상태 변경 기록
      if (!participant.statusHistory) {
        participant.statusHistory = [];
      }

      const previousStatus = participant.status;
      participant.statusHistory.push({
        previousStatus,
        newStatus: 'pending',
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name,
        isReset: true // 되돌리기임을 표시
      });

      participant.status = 'pending';
      await event.save();

      res.json({ 
        message: '참가자 상태가 대기 상태로 되돌려졌습니다.',
        resetBy: req.user.name
      });
    } catch (error) {
      console.error('Error resetting participant status:', error);
      res.status(500).json({ message: '상태 되돌리기 중 오류가 발생했습니다.' });
    }
  }
);
router.get('/:eventId/participants/:userId/status-history', 
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      res.json({ 
        statusHistory: participant.statusHistory || [],
        currentStatus: participant.status || 'pending'
      });
    } catch (error) {
      console.error('Error fetching status history:', error);
      res.status(500).json({ message: '상태 이력 조회 중 오류가 발생했습니다.' });
    }
  }
);

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
    const { 
      eventId, currentImages, newImages, deletedImages, 
      hasParticipantRules, refundPolicy, refundCustomDescription,
      // ============ 추가: 이벤트 정보 필드들도 받기 ============
      title, place, date, participants, startTime, endTime, participation_fee, contents
    } = req.body;

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
      
      // 환불 정책 검증
      if (refundPolicy === 'custom' && !refundCustomDescription?.trim()) {
        return res.status(400).json({ 
          message: '커스텀 환불 정책에 대한 설명을 입력해주세요.' 
        });
      }

      // 환불 정책 업데이트
      event.refundPolicy = refundPolicy || event.refundPolicy;
      if (refundPolicy === 'custom') {
        event.refundCustomDescription = refundCustomDescription;
      } else {
        event.refundCustomDescription = undefined;
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

      // ============ 수정: 이벤트 정보 직접 업데이트 ============
      event.images = finalImages;
      event.hasParticipantRules = hasParticipantRules;
      
      // 이벤트 기본 정보 업데이트
      if (title) event.title = title;
      if (place) event.place = place;
      if (date) event.date = date;
      if (participants !== undefined) event.participants = participants;
      if (startTime) event.startTime = startTime;
      if (endTime) event.endTime = endTime;
      if (participation_fee !== undefined) event.participation_fee = participation_fee;
      if (contents) event.contents = contents;
      // ============ 수정 끝 ============

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

// 이벤트 종료 처리
router.post('/:id/end',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      event.isEnded = true;
      await event.save();

      res.json({ message: '이벤트가 종료되었습니다.' });
    } catch (error) {
      console.error('Error ending event:', error);
      res.status(500).json({ message: '이벤트 종료 처리 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
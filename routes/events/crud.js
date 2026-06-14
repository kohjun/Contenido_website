// routes/events/crud.js
// 이벤트 CRUD + 캘린더/종료 목록 라우트
// (이전: routes/events.js 의 1~167, 240~309, 665~812)

const express = require('express');
const path = require('path');
const fs = require('fs');
const Event = require('../../models/Event');
const Review = require('../../models/Review');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');
const { upload, handleMulterError, processAndSaveImages } = require('./_multer');

const router = express.Router();

/* =========================================================================
   GET — 목록 / 메타
   ========================================================================= */

// 모든 진행중 이벤트
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isEnded: false }).populate('creator', 'displayName email');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
});

// 카카오 JS 키
router.get('/kakao-key', (req, res) => {
  res.json({ kakaoKey: process.env.KAKAO_JAVASCRIPT_KEY });
});

// 캘린더용 이벤트 포맷
router.get('/calendar', async (req, res) => {
  try {
    const events = await Event.find({ isEnded: false });
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

// 종료된 이벤트 (리뷰 평점 포함)
router.get('/ended',
  authenticateToken,
  authorizeRoles('officer', 'participant', 'starter', 'admin', 'guest'),
  async (req, res) => {
    try {
      const endedEvents = await Event.find({ isEnded: true });

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

// 특정 이벤트
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

/* =========================================================================
   POST — 이벤트 등록
   ========================================================================= */

router.post('/',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  upload.array('images', 3),
  handleMulterError,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.department !== 'planning') {
        return res.status(403).json({
          message: '기획부 또는 관리자만 이벤트 생성이 가능합니다.'
        });
      }

      const {
        title, date, place, participants, startTime, endTime,
        participation_fee, contents, team, accessCode, hasParticipantRules,
        refundPolicy, refundCustomDescription,
        // 새 필드
        tags, applicationStartAt, applicationDeadlineAt, confirmationDeadlineAt,
        maxApplicants, feeType, participation_fee_max,
        // 번개 이벤트 필드
        isLightning, lightningQuestions
      } = req.body;

      const resolvedIsLightning = isLightning === 'true' || isLightning === true;
      let parsedLightningQuestions = [];
      if (lightningQuestions) {
        try {
          parsedLightningQuestions = typeof lightningQuestions === 'string'
            ? JSON.parse(lightningQuestions)
            : lightningQuestions;
          if (!Array.isArray(parsedLightningQuestions)) parsedLightningQuestions = [];
        } catch (e) {
          parsedLightningQuestions = [];
        }
      }

      // 입력값 검증
      if (resolvedIsLightning) {
        if (!title || !date || !startTime || !endTime || !contents || !team || !accessCode) {
          return res.status(400).json({ message: '모든 필수 필드를 입력해주세요. (제목, 날짜, 시작/종료시간, 내용, 팀, 접근코드 등)' });
        }
      } else {
        if (!title || !date || !place || !participants || !startTime ||
          !endTime || !participation_fee || !contents || !team || !accessCode || !confirmationDeadlineAt) {
          return res.status(400).json({ message: '모든 필수 필드를 입력해주세요. (참가자 확정 마감 시간 포함)' });
        }
      }

      if (refundPolicy === 'custom' && !refundCustomDescription?.trim()) {
        return res.status(400).json({
          message: '커스텀 환불 정책에 대한 설명을 입력해주세요.'
        });
      }
      if (!/^\d{4}$/.test(accessCode)) {
        return res.status(400).json({ message: '접근 코드는 4자리 숫자여야 합니다.' });
      }

      // 새 필드 파싱 / 검증
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
          if (!Array.isArray(parsedTags)) parsedTags = [];
        } catch (e) {
          parsedTags = [];
        }
      }

      const toDate = (v) => (v ? new Date(v) : null);
      const appStart = toDate(applicationStartAt);
      const appEnd   = toDate(applicationDeadlineAt);
      const conEnd   = toDate(confirmationDeadlineAt);

      // 기간 검증 (값이 있을 때만)
      if (appStart && appEnd && appStart >= appEnd) {
        return res.status(400).json({ message: '신청 시작이 신청 마감보다 빠르거나 같아야 합니다.' });
      }
      if (appEnd && conEnd && appEnd > conEnd) {
        return res.status(400).json({ message: '신청 마감이 참가자 확정 마감보다 늦을 수 없습니다.' });
      }
      if (conEnd && new Date(date) && conEnd > new Date(date)) {
        return res.status(400).json({ message: '참가자 확정 마감이 이벤트 날짜보다 늦을 수 없습니다.' });
      }

      const parsedMaxApplicants = maxApplicants ? parseInt(maxApplicants) : null;
      const parsedParticipants  = resolvedIsLightning ? (participants ? parseInt(participants) : 999) : parseInt(participants);
      if (!resolvedIsLightning && parsedMaxApplicants !== null && parsedMaxApplicants < parsedParticipants) {
        return res.status(400).json({ message: '최대 신청자수는 정원보다 작을 수 없습니다.' });
      }

      const resolvedFeeType = feeType === 'range' ? 'range' : 'fixed';
      const parsedFee    = resolvedIsLightning ? (participation_fee ? parseInt(participation_fee) : 0) : parseInt(participation_fee);
      const parsedFeeMax = participation_fee_max ? parseInt(participation_fee_max) : null;
      if (resolvedFeeType === 'range' && !resolvedIsLightning) {
        if (parsedFeeMax === null || parsedFeeMax <= parsedFee) {
          return res.status(400).json({ message: '참가비 범위는 최대값이 최소값보다 커야 합니다.' });
        }
      }

      // 이미지 처리 및 압축 저장
      const savedImages = req.files ? await processAndSaveImages(req.files) : [];

      const eventData = {
        title,
        date,
        place: resolvedIsLightning ? (place || '자율 장소') : place,
        participants: parsedParticipants,
        startTime,
        endTime,
        participation_fee: parsedFee,
        contents,
        team,
        accessCode,
        images: savedImages,
        creator: req.user.id,
        isSelective: req.body.isSelective === 'true',
        isLightning: resolvedIsLightning,
        lightningQuestions: parsedLightningQuestions,
        refundPolicy: resolvedIsLightning ? 'none' : (refundPolicy || 'standard'),
        refundCustomDescription: (!resolvedIsLightning && refundPolicy === 'custom') ? refundCustomDescription : undefined,
        additionalQuestions: req.body.isSelective === 'true' && req.body.additionalQuestions
          ? JSON.parse(req.body.additionalQuestions)
          : [],
        hasParticipantRules: hasParticipantRules === 'true',
        // 새 필드
        tags: parsedTags,
        applicationStartAt:     appStart,
        applicationDeadlineAt:  appEnd,
        confirmationDeadlineAt: conEnd,
        maxApplicants:          parsedMaxApplicants,
        feeType:                resolvedFeeType,
        participation_fee_max:  resolvedFeeType === 'range' ? parsedFeeMax : null,
      };

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

/* =========================================================================
   PUT — 이벤트 수정 (생성자 only)
   ========================================================================= */

router.put('/update-content',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    const {
      eventId, currentImages, newImages, deletedImages,
      hasParticipantRules, refundPolicy, refundCustomDescription,
      title, place, date, participants, startTime, endTime, participation_fee, contents,
      // 새 필드
      tags, applicationStartAt, applicationDeadlineAt, confirmationDeadlineAt,
      maxApplicants, feeType, participation_fee_max
    } = req.body;

    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      if (event.creator.toString() !== req.user.id) {
        return res.status(403).json({
          message: '이벤트 생성자만 수정할 수 있습니다.'
        });
      }

      if (refundPolicy === 'custom' && !refundCustomDescription?.trim()) {
        return res.status(400).json({
          message: '커스텀 환불 정책에 대한 설명을 입력해주세요.'
        });
      }

      // 환불 정책
      event.refundPolicy = refundPolicy || event.refundPolicy;
      if (refundPolicy === 'custom') {
        event.refundCustomDescription = refundCustomDescription;
      } else {
        event.refundCustomDescription = undefined;
      }

      // 삭제된 이미지 처리
      if (deletedImages && deletedImages.length > 0) {
        for (const imagePath of deletedImages) {
          const fullPath = path.join(__dirname, '..', '..', 'public', imagePath);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
          }
        }
      }

      // 이미지 배열
      let finalImages = [];
      if (currentImages) finalImages = [...currentImages];
      if (newImages)     finalImages = [...finalImages, ...newImages];

      if (finalImages.length > 3) {
        return res.status(400).json({ message: '이미지는 최대 3개까지만 허용됩니다.' });
      }

      event.images = finalImages;
      event.hasParticipantRules = hasParticipantRules;

      if (title) event.title = title;
      if (place) event.place = place;
      if (date) event.date = date;
      if (participants !== undefined) event.participants = participants;
      if (startTime) event.startTime = startTime;
      if (endTime) event.endTime = endTime;
      if (participation_fee !== undefined) event.participation_fee = participation_fee;
      if (contents) event.contents = contents;

      // 새 필드 (수정 모드에서 들어올 때만)
      if (tags !== undefined) {
        try {
          event.tags = typeof tags === 'string' ? JSON.parse(tags) : (Array.isArray(tags) ? tags : []);
        } catch (e) {
          event.tags = [];
        }
      }
      if (applicationStartAt     !== undefined) event.applicationStartAt     = applicationStartAt     ? new Date(applicationStartAt)     : null;
      if (applicationDeadlineAt  !== undefined) event.applicationDeadlineAt  = applicationDeadlineAt  ? new Date(applicationDeadlineAt)  : null;
      if (confirmationDeadlineAt !== undefined) {
        if (!confirmationDeadlineAt && !event.isLightning) {
          return res.status(400).json({ message: '참가자 확정 마감 시간을 입력해주세요.' });
        }
        event.confirmationDeadlineAt = confirmationDeadlineAt ? new Date(confirmationDeadlineAt) : null;
      }
      if (maxApplicants !== undefined) {
        event.maxApplicants = maxApplicants ? parseInt(maxApplicants) : null;
      }
      if (feeType !== undefined) {
        event.feeType = feeType === 'range' ? 'range' : 'fixed';
        event.participation_fee_max = event.feeType === 'range' && participation_fee_max
          ? parseInt(participation_fee_max)
          : null;
      }

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

/* =========================================================================
   DELETE — 이벤트 삭제 (생성자 only)
   ========================================================================= */

router.delete('/:id',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
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
  });

module.exports = router;

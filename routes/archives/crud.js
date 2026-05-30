// routes/archives/crud.js
// 아카이브 조회/저장 라우트 (ended-events, view, event, save-external, temp-save, final-save)
// (이전: routes/archives.js)

const express = require('express');
const router = express.Router();
const Archive = require('../../models/Archive');
const Event = require('../../models/Event');
const Review = require('../../models/Review');
const authenticateToken = require('../../middleware/authMiddleware');
const { checkPlanningAccess } = require('./_shared');
const { generateAndUploadPdf } = require('./pdf');


// ─────────────────────────────────────────────────────────────
// GET /ended-events  —  종료된 이벤트 목록 (페이지네이션)
// ─────────────────────────────────────────────────────────────
router.get('/ended-events',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const page   = parseInt(req.query.page)  || 1;
      const limit  = parseInt(req.query.limit) || 20;
      const skip   = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || ''; // 'archived' | 'pending'

      // 1. 종료된 이벤트
      let eventQuery = { isEnded: true };
      if (search) {
        eventQuery.$or = [
          { title: { $regex: search, $options: 'i' } },
          { place: { $regex: search, $options: 'i' } },
          { team:  { $regex: search, $options: 'i' } },
        ];
      }
      const events = await Event.find(eventQuery)
        .select('title date place team images')
        .sort({ date: -1 });

      const eventsWithStatus = await Promise.all(
        events.map(async (event) => {
          const archive = await Archive.findOne({ eventId: event._id });
          return {
            _id: event._id,
            title: event.title,
            date: event.date,
            place: event.place,
            team: event.team,
            images : event.images,
            hasArchive: !!archive,
            archived: archive?.archived || false,
            externalEvent: false,
          };
        })
      );

      // 2. 외부 이벤트 아카이브
      let externalQuery = { externalEvent: true };
      if (search) {
        externalQuery.$or = [
          { 'eventSnapshot.title': { $regex: search, $options: 'i' } },
          { 'eventSnapshot.place': { $regex: search, $options: 'i' } },
          { 'eventSnapshot.team':  { $regex: search, $options: 'i' } },
        ];
      }
      const externalArchives = await Archive.find(externalQuery)
        .select('eventSnapshot archived archivedAt')
        .sort({ 'eventSnapshot.date': -1 });

      const externalEvents = externalArchives.map(a => ({
        _id: a._id,
        title: a.eventSnapshot?.title || '제목 없음',
        date:  a.eventSnapshot?.date  || null,
        place: a.eventSnapshot?.place || '',
        team:  a.eventSnapshot?.team  || '외부',
        hasArchive: true,
        archived: a.archived,
        externalEvent: true,
      }));

      // 3. 합산 + 날짜 정렬 + 상태 필터
      let allEvents = [...eventsWithStatus, ...externalEvents]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (status === 'archived') allEvents = allEvents.filter(e => e.archived);
      if (status === 'pending')  allEvents = allEvents.filter(e => !e.archived);

      const total = allEvents.length;
      res.json({
        events: allEvents.slice(skip, skip + limit),
        total,
        page,
        limit,
        hasMore: skip + limit < total,
        archivedCount: allEvents.filter(e => e.archived).length,
      });
    } catch (error) {
      console.error('이벤트 목록 조회 에러:', error);
      res.status(500).json({ error: '이벤트 목록을 불러올 수 없습니다.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /view/:eventId  —  아카이브 조회 (view 전용)
// ─────────────────────────────────────────────────────────────
router.get('/view/:eventId',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const archive = await Archive.findOne({ eventId: req.params.eventId })
        .populate('participantInfo.finalParticipants', 'name gender')
        .populate('archivedBy', 'name');

      if (!archive) return res.status(404).json({ error: '아카이브를 찾을 수 없습니다.' });
      res.json(archive);
    } catch (error) {
      console.error('아카이브 조회 에러:', error);
      res.status(500).json({ error: '아카이브를 불러올 수 없습니다.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /event/:eventId  —  이벤트 + 리뷰 + 기존 아카이브 조회
//
// ✅ 수정 포인트: 프론트 ArchiveDetail.jsx의 loadEvent()는
//    res.json() 최상위에서 바로 event 필드를 기대하므로
//    { title, date, place, ... } 를 flat하게 반환한다.
//    reviews / reviewSummary / participantSummary / archive 는
//    별도 키로 함께 반환한다.
// ─────────────────────────────────────────────────────────────
router.get('/event/:eventId',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      // 유효성 검사
      if (!eventId || eventId === 'new' || eventId === 'undefined') {
        return res.status(400).json({ error: '유효하지 않은 이벤트 ID입니다.' });
      }

      // 이벤트 조회
      const event = await Event.findById(eventId)
        .populate('appliedParticipants.userId', 'name gender')
        .populate('finalParticipants', 'name gender')
        .populate('creator', 'name');

      if (!event) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });

      // 리뷰 조회
      const reviews = await Review.find({ eventId })
        .populate('userId', 'displayName name')
        .select('rating comment isAnonymous userId createdAt');

      const averageRating = reviews.length > 0
        ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
        : 0;

      // 기존 아카이브
      const existingArchive = await Archive.findOne({ eventId });

      // ──────────────────────────────────────────────────────
      // ✅ 핵심 수정:
      //    프론트에서 setEvent(data) 후 event.title / event.date 로
      //    접근하므로, 이벤트 필드를 최상위 레벨에 flat하게 포함한다.
      //    (event 서브키도 병행 제공해서 하위 호환 유지)
      // ──────────────────────────────────────────────────────
      res.json({
        // ── flat 필드 (프론트 ArchiveDetail이 직접 참조) ──
        _id:   event._id,
        title: event.title,
        date:  event.date,       // ← Invalid Date의 원인이었던 부분
        place: event.place,
        team:  event.team,
        startTime: event.startTime,
        endTime:   event.endTime,
        participation_fee: event.participation_fee,
        contents: event.contents,
        images:   event.images || [],
        appliedParticipants: event.appliedParticipants || [],
        finalParticipants:   event.finalParticipants   || [],

        // ── 추가 데이터 ──
        reviews: reviews.map(r => ({
          userId:      r.userId?._id,
          userName:    r.isAnonymous ? '익명' : (r.userId?.displayName || r.userId?.name || '익명'),
          rating:      r.rating,
          comment:     r.comment,
          isAnonymous: r.isAnonymous,
          createdAt:   r.createdAt,
        })),
        reviewSummary: {
          totalReviews: reviews.length,
          averageRating,
        },
        participantSummary: {
          totalApplied: event.appliedParticipants?.length || 0,
          totalFinal:   event.finalParticipants?.length   || 0,
        },

        // 기존 아카이브 (있으면 formData 초기값으로 사용)
        archive: existingArchive || null,
      });
    } catch (error) {
      console.error('이벤트 조회 에러:', error);
      res.status(500).json({ error: '이벤트 정보를 불러올 수 없습니다.' });
    }
  }
);


// ─────────────────────────────────────────────────────────────
// POST /save-external  —  외부 이벤트 아카이브 저장
// ─────────────────────────────────────────────────────────────
router.post('/save-external',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const archiveData = {
        eventId: null,
        externalEvent: true,
        ...req.body,
        archived: true,
        archivedAt: new Date(),
        archivedBy: req.user._id,
      };

      const pdfUrl = await generateAndUploadPdf(archiveData, 'external');
      if (pdfUrl) archiveData.media = { ...archiveData.media, archivePdf: pdfUrl };

      const archive = new Archive(archiveData);
      await archive.save();

      res.json({ message: '외부 이벤트 아카이브가 저장되었습니다.', archive, pdfUrl });
    } catch (error) {
      console.error('외부 이벤트 아카이브 저장 에러:', error);
      res.status(500).json({ error: '아카이브 저장에 실패했습니다.', details: error.message });
    }
  }
);

router.put('/temp-save/:eventId',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const { eventId } = req.params;
 
      const event = await Event.findById(eventId)
        .populate('finalParticipants', 'name gender');
      if (!event) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
 
      const reviews = await Review.find({ eventId })
        .populate('userId', 'displayName name')
        .select('rating comment isAnonymous userId createdAt');
 
      const averageRating = reviews.length > 0
        ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
        : 0;
 
      // 임시 저장 데이터 (archived: false)
      const archiveData = {
        ...req.body,
        eventId,
        externalEvent: false,
 
        eventSnapshot: {
          title:             event.title,
          date:              event.date,
          place:             event.place,
          team:              event.team,
          startTime:         event.startTime,
          endTime:           event.endTime,
          participation_fee: event.participation_fee,
          contents:          event.contents,
          images:            event.images || [],
        },
 
        participantInfo: {
          totalApplied: event.appliedParticipants?.length || 0,
          totalFinal:   event.finalParticipants?.length   || 0,
          male:         req.body.participantInfo?.male     || 0,
          female:       req.body.participantInfo?.female   || 0,
          ageRange:     req.body.participantInfo?.ageRange || '',
          location:     req.body.participantInfo?.location || '',
          finalParticipants: event.finalParticipants,
        },
 
        reviewSnapshot: {
          averageRating,
          totalReviews: reviews.length,
          reviews: reviews.map(r => ({
            userId:      r.userId?._id,
            userName:    r.isAnonymous ? '익명' : (r.userId?.displayName || r.userId?.name || '익명'),
            rating:      r.rating,
            comment:     r.comment,
            isAnonymous: r.isAnonymous,
            createdAt:   r.createdAt,
          })),
        },
 
        archived:   false,  // ← 임시 저장은 archived false
        archivedAt: null,
        archivedBy: null,
      };
 
      // upsert (PDF 생성 X)
      const archive = await Archive.findOneAndUpdate(
        { eventId },
        archiveData,
        { new: true, upsert: true }
      );
 
      res.json({ message: '임시 저장되었습니다.', archive });
    } catch (error) {
      console.error('임시 저장 에러:', error);
      res.status(500).json({ error: '임시 저장에 실패했습니다.', details: error.message });
    }
  }
);
 
// ─────────────────────────────────────────────────────────────
// PUT /final-save/:eventId  —  최종 저장 (MongoDB + PDF + archived: true)
// ─────────────────────────────────────────────────────────────
router.put('/final-save/:eventId',
  authenticateToken,
  checkPlanningAccess,
  async (req, res) => {
    try {
      const { eventId } = req.params;
 
      // 이미 최종 저장되었는지 확인
      const existingArchive = await Archive.findOne({ eventId });
      if (existingArchive?.archived) {
        return res.status(400).json({ 
          error: '이미 최종 아카이브로 저장된 이벤트입니다.',
          message: '최종 저장된 아카이브는 수정할 수 없습니다.'
        });
      }
 
      const event = await Event.findById(eventId)
        .populate('finalParticipants', 'name gender');
      if (!event) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
 
      const reviews = await Review.find({ eventId })
        .populate('userId', 'displayName name')
        .select('rating comment isAnonymous userId createdAt');
 
      const averageRating = reviews.length > 0
        ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
        : 0;
 
      // 최종 저장 데이터
      const archiveData = {
        ...req.body,
        eventId,
        externalEvent: false,
 
        eventSnapshot: {
          title:             event.title,
          date:              event.date,
          place:             event.place,
          team:              event.team,
          startTime:         event.startTime,
          endTime:           event.endTime,
          participation_fee: event.participation_fee,
          contents:          event.contents,
          images:            event.images || [],
        },
 
        participantInfo: {
          totalApplied: event.appliedParticipants?.length || 0,
          totalFinal:   event.finalParticipants?.length   || 0,
          male:         req.body.participantInfo?.male     || 0,
          female:       req.body.participantInfo?.female   || 0,
          ageRange:     req.body.participantInfo?.ageRange || '',
          location:     req.body.participantInfo?.location || '',
          finalParticipants: event.finalParticipants,
        },
 
        reviewSnapshot: {
          averageRating,
          totalReviews: reviews.length,
          reviews: reviews.map(r => ({
            userId:      r.userId?._id,
            userName:    r.isAnonymous ? '익명' : (r.userId?.displayName || r.userId?.name || '익명'),
            rating:      r.rating,
            comment:     r.comment,
            isAnonymous: r.isAnonymous,
            createdAt:   r.createdAt,
          })),
        },
 
        archived:   true,      // ← 최종 저장
        archivedAt: new Date(),
        archivedBy: req.user._id,
      };
 
      // PDF 생성 & S3 업로드
      const pdfUrl = await generateAndUploadPdf(archiveData, eventId);
      if (pdfUrl) archiveData.media = { ...archiveData.media, archivePdf: pdfUrl };
 
      // upsert
      const archive = await Archive.findOneAndUpdate(
        { eventId },
        archiveData,
        { new: true, upsert: true }
      );
 
      res.json({ message: '최종 아카이브가 저장되었습니다.', archive, pdfUrl });
    } catch (error) {
      console.error('최종 저장 에러:', error);
      res.status(500).json({ error: '최종 저장에 실패했습니다.', details: error.message });
    }
  }
);

module.exports = router;

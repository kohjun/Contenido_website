// routes/archives.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Event = require('../models/Event');
const authenticateToken = require('../middleware/authMiddleware');

// authorizeRoles 미들웨어 (기존에 없다면 추가)
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    next();
  };
};

// S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'contenido-archives';

// Multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|doc|docx|xlsx|pptx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('지원하지 않는 파일 형식입니다.'));
  }
});

// ========== 종료된 이벤트 목록 ==========
router.get('/ended-events',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const events = await Event.find({ isEnded: true })
        .select('title date place participants team archive')
        .sort({ date: -1 });
      res.json(events);
    } catch (error) {
      console.error('종료된 이벤트 조회 에러:', error);
      res.status(500).json({ error: '이벤트 목록을 불러올 수 없습니다.' });
    }
});

// ========== 이벤트 상세 조회 ==========
router.get('/event/:eventId',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId)
        .populate('appliedParticipants.userId', 'name gender')
        .populate('finalParticipants')
        .populate('creator', 'name');

      if (!event) {
        return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
      }

      res.json(event);
    } catch (error) {
      console.error('이벤트 조회 에러:', error);
      res.status(500).json({ error: '이벤트 정보를 불러올 수 없습니다.' });
    }
});

// ========== 파일 업로드 ==========
router.post('/upload/:eventId',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '파일이 없습니다.' });
      }

      const { category } = req.body;
      const eventId = req.params.eventId;
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const ext = req.file.originalname.split('.').pop();
      const fileName = `archives/${eventId}/${category}/${timestamp}_${randomString}.${ext}`;

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      }));

      const fileUrl = process.env.S3_ENDPOINT 
        ? `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`
        : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      res.json({
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error('파일 업로드 에러:', error);
      res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
    }
});

// ========== 아카이브 저장 ==========
router.put('/save/:eventId',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId);
      
      if (!event) {
        return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
      }

      if (!event.isEnded) {
        return res.status(400).json({ error: '종료된 이벤트만 아카이브할 수 있습니다.' });
      }

      const data = req.body;

      event.archive = {
        // 기획 배경
        background: {
          why: data.background?.why || '',
          who: data.background?.who || '',
          what: data.background?.what || ''
        },
        
        // 솔루션
        solution: {
          differentiation: data.solution?.differentiation || '',
          approach: data.solution?.approach || '',
          expectedEffect: data.solution?.expectedEffect || ''
        },
        
        // 기획 컨셉
        concept: {
          mainConcept: data.concept?.mainConcept || '',
          conceptDetail: data.concept?.conceptDetail || '',
          worldView: data.concept?.worldView || ''
        },
        
        // 콘텐츠 구조
        structure: {
          format: data.structure?.format || '',
          overview: data.structure?.overview || ''
        },
        
        // 타임라인
        timeline: data.timeline || [],
        
        // 게임/활동
        games: data.games || [],
        
        // 예산
        budget: {
          items: data.budget?.items || [],
          total: data.budget?.total || 0
        },
        
        // 스태프
        staff: data.staff || [],
        
        // 참가자
        participants: {
          total: data.participants?.total || 0,
          male: data.participants?.male || 0,
          female: data.participants?.female || 0,
          ageRange: data.participants?.ageRange || '',
          location: data.participants?.location || ''
        },
        
        // 기대 효과
        expectedOutcomes: {
          quantitative: data.expectedOutcomes?.quantitative || [],
          qualitative: data.expectedOutcomes?.qualitative || [],
          highlights: data.expectedOutcomes?.highlights || []
        },
        
        // 참고 자료
        references: {
          benchmarking: data.references?.benchmarking || [],
          gameRules: data.references?.gameRules || [],
          budgetSource: data.references?.budgetSource || '',
          spaceDesign: data.references?.spaceDesign || ''
        },
        
        // 회고
        reflection: {
          coreStrategies: data.reflection?.coreStrategies || [],
          challenges: data.reflection?.challenges || [],
          learnings: data.reflection?.learnings || [],
          summary: data.reflection?.summary || ''
        },
        
        // 피드백
        feedback: {
          improvements: data.feedback?.improvements || '',
          regrets: data.feedback?.regrets || '',
          rating: data.feedback?.rating || 0,
          reviews: data.feedback?.reviews || []
        },
        
        // 미디어
        media: {
          images: data.media?.images || [],
          instagram: data.media?.instagram || '',
          youtube: data.media?.youtube || '',
          proposal: data.media?.proposal || ''
        },
        
        // 메타
        archived: true,
        archivedAt: new Date(),
        archivedBy: req.user.id
      };

      await event.save();

      res.json({ 
        message: '아카이브가 저장되었습니다.',
        archive: event.archive
      });
    } catch (error) {
      console.error('아카이브 저장 에러:', error);
      res.status(500).json({ error: '아카이브 저장에 실패했습니다.' });
    }
});

// ========== 아카이브 조회 ==========
router.get('/view/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.eventId)
        .populate('archive.archivedBy', 'name');

      if (!event || !event.archive?.archived) {
        return res.status(404).json({ error: '아카이브를 찾을 수 없습니다.' });
      }

      res.json({
        event: {
          _id: event._id,
          title: event.title,
          date: event.date,
          place: event.place,
          team: event.team,
          participants: event.participants
        },
        archive: event.archive
      });
    } catch (error) {
      console.error('아카이브 조회 에러:', error);
      res.status(500).json({ error: '아카이브 조회에 실패했습니다.' });
    }
});

module.exports = router;
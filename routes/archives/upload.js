// routes/archives/upload.js
// 파일 업로드 라우트 (upload/:eventId, upload/external)
// (이전: routes/archives.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const { checkPlanningAccess, upload, uploadToS3 } = require('./_shared');

// ─────────────────────────────────────────────────────────────
// POST /upload/:eventId  —  파일 업로드
// ─────────────────────────────────────────────────────────────
router.post('/upload/:eventId',
  authenticateToken,
  checkPlanningAccess,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

      const { category } = req.body;
      const eventId = req.params.eventId;
      const ts  = Date.now();
      const rnd = Math.random().toString(36).substring(2, 15);
      const ext = req.file.originalname.split('.').pop();
      const key = `archives/${eventId}/${category}/${ts}_${rnd}.${ext}`;

      try {
        const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);
        res.json({ url, filename: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype, category });
      } catch (s3Error) {
        console.error('S3 업로드 에러:', s3Error.message);
        if (s3Error.code === 'ECONNREFUSED') {
          return res.status(503).json({ error: 'S3 연결 실패. MinIO가 실행 중인지 확인해주세요.', hint: 'docker start minio-contenido' });
        }
        throw s3Error;
      }
    } catch (error) {
      console.error('파일 업로드 에러:', error);
      res.status(500).json({ error: '파일 업로드에 실패했습니다.', details: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /upload/external  —  외부 이벤트 파일 업로드
// ─────────────────────────────────────────────────────────────
router.post('/upload/external',
  authenticateToken,
  checkPlanningAccess,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

      const { category } = req.body;
      const ts  = Date.now();
      const rnd = Math.random().toString(36).substring(2, 15);
      const ext = req.file.originalname.split('.').pop();
      const key = `archives/external/${category}/${ts}_${rnd}.${ext}`;

      try {
        const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);
        res.json({ url, filename: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype, category });
      } catch (s3Error) {
        if (s3Error.code === 'ECONNREFUSED') {
          return res.status(503).json({ error: 'S3 연결 실패.', hint: 'docker start minio-contenido' });
        }
        throw s3Error;
      }
    } catch (error) {
      console.error('파일 업로드 에러:', error);
      res.status(500).json({ error: '파일 업로드에 실패했습니다.', details: error.message });
    }
  }
);

module.exports = router;

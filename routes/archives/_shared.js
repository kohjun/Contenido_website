// routes/archives/_shared.js
// S3/Multer 설정 + uploadToS3 헬퍼 + checkPlanningAccess 미들웨어
// (이전: routes/archives.js)

const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ─────────────────────────────────────────────────────────────
// 공통 미들웨어
// ─────────────────────────────────────────────────────────────

const checkPlanningAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }
  if (req.user.role === 'admin' || 
     (req.user.role === 'officer' && req.user.department === 'planning')) {
    return next();
  }
  return res.status(403).json({ message: '기획부 운영진만 접근 가능합니다.' });
};
// ─────────────────────────────────────────────────────────────
// S3 / Multer
// ─────────────────────────────────────────────────────────────
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'contenido-archives';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|pdf|doc|docx|xlsx|pptx/;
    if (allowed.test(file.originalname.toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('지원하지 않는 파일 형식입니다.'));
  },
});

// ─────────────────────────────────────────────────────────────
// S3 업로드 헬퍼
// ─────────────────────────────────────────────────────────────
const uploadToS3 = async (buffer, key, contentType) => {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  }));
  return process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`
    : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

module.exports = { checkPlanningAccess, s3Client, BUCKET_NAME, upload, uploadToS3 };

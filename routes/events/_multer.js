// routes/events/_multer.js
// 이벤트 이미지 업로드용 multer 및 sharp 압축 설정

const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// 메모리 스토리지 사용 (서버 단에서 sharp 압축 처리를 위해 버퍼 유지)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (대용량 업로드 허용 후 자체 압축 진행)
    files: 3
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/heic', 'image/heif', 'image/bmp'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. (jpg, png, gif, webp, heic, bmp 이미지 파일만 업로드 가능)'), false);
    }
  }
});

// 이미지 자체 압축 및 리사이징 저장 함수
async function processAndSaveImages(files) {
  if (!files || files.length === 0) return [];
  
  const dir = 'public/uploads/events';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const savedPaths = [];
  for (const file of files) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 가장 호환성이 높은 progressive JPEG 형식으로 일관성 있게 압축 저장
    const filename = uniqueSuffix + '.jpg';
    const outputPath = path.join(dir, filename);

    try {
      await sharp(file.buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }) // 해상도 리사이징 (최대 1200px)
        .jpeg({ quality: 80, progressive: true }) // 품질 80% 압축 설정
        .toFile(outputPath);

      savedPaths.push(`/uploads/events/${filename}`);
    } catch (sharpError) {
      console.error('Sharp image processing error:', sharpError);
      throw new Error(`이미지 처리 중 오류가 발생했습니다 (${file.originalname}). 파일이 손상되었거나 지원하지 않는 포맷일 수 있습니다.`);
    }
  }
  return savedPaths;
}

const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('File upload error:', err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '업로드 가능한 파일 크기는 최대 10MB입니다.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: '이미지는 최대 3개까지만 업로드 가능합니다.' });
      }
      return res.status(400).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
    }
    // fileFilter 등에서 발생한 커스텀 에러 처리
    return res.status(400).json({ message: err.message || '파일 업로드 중 오류가 발생했습니다.' });
  }
  next();
};

module.exports = { upload, processAndSaveImages, handleMulterError };

// routes/events/_multer.js
// 이벤트 이미지 업로드용 multer 설정 (crud.js, admin.js 공유)

const multer = require('multer');
const path = require('path');

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
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('지원하지 않는 파일 형식입니다.'), false);
    }
    cb(null, true);
  }
});

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

module.exports = { upload, handleMulterError };

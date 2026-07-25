// 서버 타임존을 KST로 고정 (월간 신청 1~5일 경계 등 날짜 계산이 서버 로컬시간에 의존)
process.env.TZ = 'Asia/Seoul';

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

// 모듈 선언
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./middleware/authMiddleware');
const favicon = require('serve-favicon');
const MongoStore = require('connect-mongo')(session);
const app = express();

// 스케줄러 추가
const scheduler = require('./utils/SchedulerService');
console.log('All schedulers initialized');
const TokenService = require('./utils/TokenService');
const multer = require('multer');
const optimizeImage = require('./middleware/imageMiddleware');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/events');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB 제한
  }
});

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, 'public/uploads/events');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 기본 미들웨어 세팅
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  try {
    const fs = require('fs');
    fs.appendFileSync('debug.log', `[${new Date().toISOString()}] ${req.method} ${req.url} - body: ${JSON.stringify(req.body)}\n`);
  } catch (e) {}
  next();
});

// CORS 설정 개선
app.use((req, res, next) => {
    const allowedOrigins = ['https://contenido.kr', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 세션 설정
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        // 이 부분을 아래와 같이 교체하세요
        store: new MongoStore({
            url: process.env.MONGO_URI, // v3에서는 'url'을 사용합니다
            ttl: 5 * 60 * 60,
            autoRemove: 'native',
            touchAfter: 24 * 3600
        }),
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.contenido.kr' : undefined,
            maxAge: 5 * 60 * 60 * 1000
        },
        name: 'sessionId',
        proxy: process.env.NODE_ENV === 'production'
    })
);

// Passport configuration 부분 수정
const { setupPassport } = require('./config/passportConfig');
setupPassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// API 라우터들
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/user', require('./routes/user'));
app.use('/reviews', require('./routes/reviews'));
app.use('/savedPlaces', require('./routes/savedPlaces'));
app.use('/announcement', require('./routes/announcement'));
app.use('/notifications', require('./routes/notifications'));
app.use('/archives', require('./routes/archives'));
app.use('/community', require('./routes/community'));
app.use('/promotions', require('./routes/promotions'));
app.use('/staff', require('./routes/staff'));


// 정적 파일 서빙 설정 전에 API 라우터 추가
app.use('/office', require('./routes/office')); // 운영진 라우터 추가

// Role-based routes
app.use('/', require('./routes/role'));

// 관리자 페이지 라우트들
app.get('/admin/*', (req, res, next) => {
    if (!req.isAuthenticated() || !['officer', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    next();
});





// 업로드된 파일 서빙 설정
const staticOptions = {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // HTML은 캐시하지 않음
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        } else if (path.match(/\.(js|css)$/)) {
            // JS와 CSS는 짧은 시간 캐시
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간
        } else if (path.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/)) {
            // 이미지와 폰트는 길게 캐시
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30일
            res.setHeader('Vary', 'Accept-Encoding');
        }
    },
    maxAge: '1d', // 기본 캐시 기간
    etag: true,
    lastModified: true
};

app.use(express.static('public', staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), staticOptions));

// 정적 파일 서빙 설정 전에 favicon 미들웨어 추가
app.use(favicon(path.join(__dirname, 'public', 'images', 'Contenido_Logo.ico')));

// React 빌드 경로 설정 및 확인
const reactBuildPath = path.join(__dirname, 'frontend/dist');

// 빌드 폴더가 존재하는지 확인
if (fs.existsSync(reactBuildPath)) {
    // Vite 빌드 파일 서빙 설정
    app.use(express.static(reactBuildPath, {
        ...staticOptions,
        index: false // SPA를 위해 index.html 직접 제어
    }));

    // React SPA 라우팅
    app.get('*', (req, res, next) => {
        // API 경로는 건너뛰기
        if (req.path.startsWith('/auth') || 
            req.path.startsWith('/events') || 
            req.path.startsWith('/user') || 
            req.path.startsWith('/reviews') || 
            req.path.startsWith('/community') || 
            req.path.startsWith('/savedPlaces') ||  // 추가
            req.path.startsWith('/announcement') ||
            req.path.startsWith('/notifications') ||
            req.path.startsWith('/promotions') ||
            req.path.startsWith('/api/') ||
            req.path.startsWith('/office') ||
            req.path.startsWith('/uploads')) {
            return next();
        }

        const indexPath = path.join(reactBuildPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            next();
        }
    });
} else {
    console.warn('React build directory not found at:', reactBuildPath);
}

// API 404 에러 핸들러는 모든 API 라우터 등록 후에 위치
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
    try {
      process.stderr.write(`[GLOBAL ERROR] [${new Date().toISOString()}] ${err.stack || err}\n`);
    } catch (e) {}
    console.error('Error:', err);

    // 파일 크기 제한 에러
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '파일 크기가 너무 큽니다. (최대 5MB)' });
    }

    // API/백엔드 요청에 대한 에러 응답
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/auth') || 
        req.path.startsWith('/events') || 
        req.path.startsWith('/user') || 
        req.path.startsWith('/reviews') || 
        req.path.startsWith('/savedPlaces') || 
        req.path.startsWith('/announcement') || 
        req.path.startsWith('/notifications') || 
        req.path.startsWith('/archives') || 
        req.path.startsWith('/community') || 
        req.path.startsWith('/promotions') || 
        req.xhr) {
        return res.status(500).json({
            message: '서버 에러가 발생했습니다',
            error: err.message
        });
    }

    // 일반 요청에 대한 에러 페이지
    res.status(500).send('Internal Server Error');
});

// 몽고DB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    // 레거시 유니크 인덱스 정리: kakaoId_1 (non-sparse unique)는 로컬 가입자의
    // kakaoId=null 끼리 충돌시킴 → 드롭 (Kakao 유니크는 콜백 email 조회로 보장)
    try {
      await mongoose.connection.collection('users').dropIndex('kakaoId_1');
      console.log('[fix] 레거시 kakaoId_1 인덱스 드롭 완료');
    } catch (e) {
      // 인덱스가 이미 없으면 무시
    }
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // 치명적인 데이터베이스 연결 오류시 프로세스 종료
  });

// MongoDB 연결 재시도 로직 추가
mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    setTimeout(() => {
        mongoose.connect(process.env.MONGO_URI)
            .catch(err => console.error('Retry connection failed:', err));
    }, 5000); // 5초 후 재시도
});

// 서버 실행 부분 수정
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// 서버 에러 핸들링 추가
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});

// Graceful shutdown 처리
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// 예기치 않은 에러 처리
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // 에러 로깅 후 프로세스 종료
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // 에러 로깅만 하고 프로세스는 계속 실행
});

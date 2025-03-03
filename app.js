require('dotenv').config();

// 모듈 선언
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const favicon = require('serve-favicon');
const app = express();

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, 'public/uploads/events');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 기본 미들웨어 세팅
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS 설정 (필요한 경우)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24시간
        }
    })
);

// Passport configuration
require('./config/passportConfig')(passport);
app.use(passport.initialize());
app.use(passport.session());

// API 라우터들
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/user', require('./routes/user'));
app.use('/reviews', require('./routes/reviews'));
app.use('/saved-places', require('./routes/savedPlaces'));
app.use('/application', require('./routes/application'));
app.use('/application-result', require('./routes/applicationResult')); // 수정된 경로

// Role-based routes
app.use('/', require('./routes/role'));

app.get('/admin/applications', (req, res, next) => {
    if (!req.isAuthenticated() || !['officer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    res.sendFile(path.join(__dirname, 'public/applications.html'));
  });

// 업로드된 파일 서빙 설정
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년
    }
}));

// 정적 파일 서빙 설정 전에 favicon 미들웨어 추가
app.use(favicon(path.join(__dirname, 'public', 'images', 'Contenido_Logo.ico')));

// 정적 파일 서빙 설정
app.use(express.static('public', {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') && !filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
        } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년
        }
        if (filePath.endsWith('.js')) {
            // JavaScript 파일에 대한 캐시 제어
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (filePath.endsWith('.css')) {
            // CSS 파일에 대한 캐시 제어
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Vite 빌드 파일 서빙 (React 사용 페이지)
const reactBuildPath = path.join(__dirname, 'frontend/dist');
app.use(express.static(reactBuildPath, {
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// API 404 에러 핸들러는 모든 API 라우터 등록 후에 위치
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// React 라우트 처리 (SPA 지원)
app.get('*', (req, res, next) => {
    // API 경로는 건너뛰기
    if (req.path.startsWith('/auth') || 
        req.path.startsWith('/events') || 
        req.path.startsWith('/user') || 
        req.path.startsWith('/reviews') ||
        req.path.startsWith('/saved-places') ||
        req.path.startsWith('/uploads')) {
        return next();
    }

    // HTML 직접 접근 차단
    if (req.path.endsWith('.html') && !req.path.endsWith('index.html')) {
        return res.status(403).json({ message: 'Direct access not allowed' });
    }

    // React 앱으로 라우팅
    res.sendFile(path.join(reactBuildPath, 'index.html'));
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // 파일 크기 제한 에러
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '파일 크기가 너무 큽니다. (최대 5MB)' });
    }

    // API 요청에 대한 에러 응답
    if (req.path.startsWith('/api') || req.xhr) {
        return res.status(500).json({
            message: '서버 에러가 발생했습니다',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // 일반 요청에 대한 에러 페이지
    res.status(500).send('Internal Server Error');
});

// 몽고DB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // 치명적인 데이터베이스 연결 오류시 프로세스 종료
  });
// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
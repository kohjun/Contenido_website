require('dotenv').config();

// 모듈 선언
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

// Passport configuration
require('./config/passportConfig')(passport);

// 기본 미들웨어 세팅
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Passport middleware initialization
app.use(passport.initialize());
app.use(passport.session());

// Role-based routes를 먼저 등록 (중요: 정적 파일 서빙보다 먼저)
app.use('/', require('./routes/role'));

// 정적 파일 서빙 (기존 public 디렉토리)
app.use(
  express.static('public', {
    setHeaders: (res, path) => {
      if (path.endsWith('.html') && !path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    },
  })
);

// Vite 빌드 파일 서빙 (React 사용 페이지)
// React의 빌드된 정적 파일 경로를 추가
const reactBuildPath = path.join(__dirname, 'frontend/dist');
app.use(express.static(reactBuildPath));

// React 라우트를 처리
app.get('*', (req, res, next) => {
  // 기존 HTML 파일 직접 접근 차단
  if (req.path.endsWith('.html') && !req.path.endsWith('index.html')) {
    return res.status(403).json({ message: 'Direct access not allowed' });
  }
  // React에서 제공하는 라우트를 처리
  if (!req.path.startsWith('/auth') && !req.path.startsWith('/events') && !req.path.startsWith('/user') && !req.path.startsWith('/reviews')) {
    return res.sendFile(path.join(reactBuildPath, 'index.html'));
  }
  next();
});

// API 라우터들
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/user', require('./routes/user'));
app.use('/reviews', require('./routes/reviews'));

// 몽고DB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://contenido.kr:${PORT}`);
});

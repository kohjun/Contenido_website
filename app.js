// Load environment variables
require('dotenv').config();

// 모듈 선언
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const path = require('path');

// Passport configuration
require('./config/passportConfig')(passport);

// 기본 미들웨어 세팅
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));   

// Passport middleware initialization
app.use(passport.initialize());
app.use(passport.session());

// Role based routes를 먼저 등록 (중요: 정적 파일 서빙보다 먼저)
app.use('/', require('./routes/role'));

// 그 다음 정적 파일 서빙
app.use(express.static('public', {
    setHeaders: (res, path) => {
      if (path.endsWith('.html') && !path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    }
}));

// API 라우터들
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/user', require('./routes/user'));
app.use('/reviews', require('./routes/reviews'));

// Catch all route for HTML files
app.get('*.html', (req, res, next) => {
    if (!req.path.endsWith('index.html')) {
      return res.status(403).json({ message: 'Direct access not allowed' });
    }
    next();
});

// 몽고DB 연결
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection error:', error));

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on https://contenido.kr:${PORT}`);
});
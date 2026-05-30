// routes/archives/index.js
// archives sub-router 결합 (app.js의 `app.use('/archives', require('./routes/archives'))`)
//   crud.js   — GET /ended-events, /view/:eventId, /event/:eventId, POST /save-external, PUT /temp-save/:eventId, /final-save/:eventId
//   upload.js — POST /upload/:eventId, /upload/external
//   pdf.js    — (헬퍼 모듈, 라우트 없음)

const express = require('express');
const router = express.Router();

router.use('/', require('./crud'));
router.use('/', require('./upload'));

module.exports = router;

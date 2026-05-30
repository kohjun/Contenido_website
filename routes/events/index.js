// routes/events/index.js
// 이벤트 관련 모든 sub-router 결합 (app.js의 `app.use('/events', require('./routes/events'))`에서 사용)
//
// 라우트 분포:
//   crud.js          — GET / / kakao-key / calendar / ended / :id, POST /, PUT /update-content, DELETE /:id
//   participants.js  — GET /:id/participants, /:id/approved-participants, /.../status-history,
//                      POST /:id/verify-access, /:id/apply, /:id/cancel-application,
//                      /:eventId/participants/:userId/status (+reset)
//   admin.js         — POST /upload-images, /:id/report, /:id/end

const express = require('express');
const router = express.Router();

router.use('/', require('./crud'));
router.use('/', require('./participants'));
router.use('/', require('./admin'));

module.exports = router;

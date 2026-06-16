// routes/user/index.js
// user 관련 모든 sub-router 결합 (app.js의 `app.use('/user', require('./routes/user'))`에서 사용)
//
// 라우트 분포:
//   profile.js        — GET /info, /info_database, /user-role, POST /update-profile, PATCH /officers/:userId/work-memo
//   warnings.js       — GET /warning-history/:userId, POST /issue-warning/:userId, /remove-warning/:userId/:warningId
//   participation.js  — GET /participants/users, POST /toggle-active/:userId,
//                       /update-participation/:userId, /bulk-update
//   roles.js          — POST /update-role/:userId, /update-team/:userId, /update-staffsubteam/:userId,
//                       /update-team-leader/:userId

const express = require('express');
const router = express.Router();

router.use('/', require('./profile'));
router.use('/', require('./warnings'));
router.use('/', require('./participation'));
router.use('/', require('./roles'));
router.use('/', require('./certificate'));

module.exports = router;

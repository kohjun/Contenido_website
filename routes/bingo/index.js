// routes/bingo/index.js
// bingo sub-router 결합 (app.js의 `app.use('/api/bingo', require('./routes/bingo'))`)
//   activities.js  — 활동 CRUD
//   teams.js       — 팀 관리 (+ _assignment.js 스마트 배정)
//   missions.js    — 미션 토글/조정
//   participant.js — 참가자 셀프서비스 + 보상

const express = require('express');
const router = express.Router();

router.use('/', require('./activities'));
router.use('/', require('./teams'));
router.use('/', require('./missions'));
router.use('/', require('./participant'));

module.exports = router;

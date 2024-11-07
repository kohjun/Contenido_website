// public/js/staff.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

// 스태프 전용 라우트
router.get('/manage', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden: Staff only' });
  }
  res.render('staff'); // 또는 staff.html로 보내기
});

module.exports = router;
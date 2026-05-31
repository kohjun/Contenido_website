// routes/notifications.js
// 인앱 알림 — 본인(recipient) 것만 조회/읽음/삭제. 전부 authenticateToken.
// ---------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authenticateToken = require('../middleware/authMiddleware');

const LIST_LIMIT = 30;

// 목록 (최신순)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 안읽음 개수 (뱃지용)
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1건 읽음 처리 → readAt + expiresAt = now + 24h (recipient 포함 = IDOR 방지)
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: now, expiresAt: new Date(now.getTime() + Notification.TTL_AFTER_READ_MS) } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    res.json({ message: 'ok', notification: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 전체 읽음 처리
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: now, expiresAt: new Date(now.getTime() + Notification.TTL_AFTER_READ_MS) } }
    );
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1건 삭제 (선택)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, recipient: req.user.id });
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

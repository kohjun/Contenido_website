const express = require('express');
const router = express.Router();
const Announcement = require('../models/announcement');
const authenticateToken = require('../middleware/authMiddleware');

// Get public announcements (메인 페이지용)
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .limit(5)
      .select('title content priority');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all announcements (관리자용)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create announcement
router.post('/', authenticateToken, async (req, res) => {
  const announcement = new Announcement({
    ...req.body,
    author: req.user._id
  });

  try {
    const newAnnouncement = await announcement.save();
    res.status(201).json(newAnnouncement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update announcement
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(announcement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete announcement
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get public announcements (로그인 불필요)
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title content priority');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get public announcements (로그인 불필요)
router.get('/public', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })  // 활성화된 공지사항만 검색
      .sort({ priority: 1, createdAt: -1 })  // 우선순위순으로 정렬하고 최신순으로 정렬
      .limit(5)
      .select('title content priority');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

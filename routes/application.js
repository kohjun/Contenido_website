// routes/application.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

/**
 * 지원서 제출 API
 * POST /api/application/submit
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.application) {
      return res.status(400).json({ message: '이미 지원서를 제출하셨습니다.' });
    }

    const { school, address, wantOfficer, motivation, planningContent } = req.body;

    user.application = {
      school,
      address,
      wantOfficer,
      motivation,
      planningContent,
      status: 'pending',
      appliedAt: new Date()
    };

    await user.save();
    res.status(201).json({ message: '지원서가 성공적으로 제출되었습니다.' });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ message: '지원서 제출 중 오류가 발생했습니다.' });
  }
});


router.get('/all', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const applicants = await User.find({
      'application': { $exists: true }
    }).select('name displayName email profileImage application gender birthDate ');

    res.json(applicants);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ message: '지원자 목록을 가져오는데 실패했습니다.' });
  }
});
/**
 * 지원 상태 확인 API
 * GET /api/application/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('application');
    if (!user || !user.application) {
      return res.status(404).json({ message: '지원 정보를 찾을 수 없습니다.' });
    }
    res.json(user.application);
  } catch (error) {
    console.error('Error checking application status:', error);
    res.status(500).json({ message: '지원 상태 확인 중 오류가 발생했습니다.' });
  }
});

/**
 * 카카오톡 채팅방 URL 가져오기 API
 * GET /api/application/kakao-url
 */
router.get('/kakao-url', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('application');
    if (!user || !user.application || user.application.status !== 'accepted') {
      return res.status(403).json({ message: '채팅방 접근 권한이 없습니다.' });
    }

    // TODO: 실제 카카오톡 오픈채팅방 URL로 변경
    const chatUrl = process.env.KAKAO_CHAT_URL
    res.json({ url: chatUrl });
  } catch (error) {
    console.error('Error getting kakao chat url:', error);
    res.status(500).json({ message: '채팅방 링크 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * 모든 지원자 목록 조회 API (관리자용)
 * GET /api/application/all
 */
router.get('/all', 
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      // 쿼리 파라미터를 통한 필터링
      const { status, wantOfficer } = req.query;
      let filter = { role: 'applicant' };
      
      if (status) {
        filter['application.status'] = status;
      }
      
      if (wantOfficer !== undefined) {
        filter['application.wantOfficer'] = wantOfficer === 'true';
      }
      
      const applicants = await User.find(filter)
        .select('name displayName email profileImage application gender birthDate ')
        .sort({ 'application.appliedAt': -1 });
      
      res.json(applicants);
    } catch (error) {
      console.error('Error fetching applicants:', error);
      res.status(500).json({ message: '지원자 목록 조회 중 오류가 발생했습니다.' });
    }
});

/**
 * 지원자 상태 업데이트 API (관리자용)
 * PUT /api/application/:userId/status
 */
router.put('/:userId/status', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태값입니다.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.application) {
      return res.status(404).json({ message: '지원자를 찾을 수 없습니다.' });
    }

    user.application.status = status;
    user.application.processedAt = new Date();
    user.role = status === 'accepted' ? 'starter' : user.role;

    await user.save();
    res.json({ message: '지원 상태가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: '상태 업데이트 중 오류가 발생했습니다.' });
  }
});

/**
 * 지원자 통계 API (관리자용)
 * GET /api/application/stats
 */
router.get('/stats', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const applications = await User.find({
      'application': { $exists: true }
    });

    const stats = {
      total: applications.length,
      pending: applications.filter(app => app.application.status === 'pending').length,
      accepted: applications.filter(app => app.application.status === 'accepted').length,
      rejected: applications.filter(app => app.application.status === 'rejected').length,
      wantOfficer: applications.filter(app => app.application.wantOfficer).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting application stats:', error);
    res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
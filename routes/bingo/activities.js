// routes/bingo/activities.js
// 빙고 활동 CRUD (이전: routes/bingo.js)

const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Team = require('../../models/Team');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');

// ============== 활동 관리 API ==============

// 특정 활동 조회 (개별 활동 선택용)
router.get('/activities/:id', 
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id)
        .populate('participants', 'name role department team')
        .populate('createdBy', 'name');
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      res.json(activity);
    } catch (error) {
      console.error('활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 미션 설정 저장
router.put('/activities/:id/missions',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { bingoMissions } = req.body;
      const activity = await Activity.findById(req.params.id);
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      activity.bingoMissions = bingoMissions;
      await activity.save();
      
      res.json({ message: '미션 설정이 저장되었습니다.' });
    } catch (error) {
      console.error('미션 저장 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);
// 모든 활동 조회 (관리자)
router.get('/activities', 
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activities = await Activity.find()
        .populate('participants', 'name role department team')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
      
      res.json(activities);
    } catch (error) {
      console.error('활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동 생성 (관리자)
router.post('/activities',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { title, startDate, endDate, description, targetBingos, bingoMissions } = req.body;
      
      // 유효성 검사
      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
      }
      
      const activity = new Activity({
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        targetBingos: targetBingos || 2,
        bingoMissions: bingoMissions || [],
        createdBy: req.user.id
      });
      
      await activity.save();
      res.status(201).json(activity);
    } catch (error) {
      console.error('활동 생성 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동 수정 (관리자)
router.put('/activities/:id',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      Object.assign(activity, req.body);
      await activity.save();
      
      res.json(activity);
    } catch (error) {
      console.error('활동 수정 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동에 참가자 추가/제거 (관리자)
router.post('/activities/:id/participants',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { userIds, action } = req.body; // action: 'add' or 'remove'
      const activity = await Activity.findById(req.params.id);
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      if (action === 'add') {
        userIds.forEach(userId => {
          if (!activity.participants.includes(userId)) {
            activity.participants.push(userId);
          }
        });
      } else if (action === 'remove') {
        activity.participants = activity.participants.filter(
          id => !userIds.includes(id.toString())
        );
      }
      
      await activity.save();
      await activity.populate('participants', 'name role department team');
      
      res.json(activity);
    } catch (error) {
      console.error('참가자 관리 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);


module.exports = router;

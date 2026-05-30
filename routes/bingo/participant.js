// routes/bingo/participant.js
// 참가자 셀프서비스 + 보상 처리 (my-activities, my-team, complete) (이전: routes/bingo.js)

const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Team = require('../../models/Team');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');

// 내가 참여한 활동 목록 - 팀 정보 포함
// routes/bingo.js
router.get('/my-activities',
  authenticateToken,
  async (req, res) => {
    try {
      const activities = await Activity.find({
        participants: req.user.id,
        isActive: true
      }).sort({ startDate: -1 });
      
      // 각 활동에 대한 팀 정보 추가
      const activitiesWithTeam = await Promise.all(
        activities.map(async (activity) => {
          const team = await Team.findOne({
            activityId: activity._id,
            members: req.user.id
          });
          
          const activityObj = activity.toObject();
          
          if (team) {
            await team.calculateBingoCount();
            activityObj.myTeam = {
              name: team.name,
              bingoCount: team.bingoCount,
              progressRate: team.getProgressRate(),
              completedMissions: team.progress.filter(p => p.completed).length
            };
          } else {
            activityObj.myTeam = null;
          }
          
          return activityObj;
        })
      );
      
      res.json(activitiesWithTeam);
    } catch (error) {
      console.error('내 활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 내 조 정보 조회
router.get('/activities/:id/my-team',
  authenticateToken,
  async (req, res) => {
    try {
      const team = await Team.findOne({
        activityId: req.params.id,
        members: req.user.id
      })
      .populate('members', 'name role department team gender birthDate')
      .populate('leaderId', 'name')
      .populate('activityId', 'title description targetBingos bingoMissions');
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 빙고 카운트 계산
      await team.calculateBingoCount();
      
      // summary 정보 추가
      const summary = await team.getSummary();
      
      res.json({
        ...team.toObject(),
        summary
      });
    } catch (error) {
      console.error('내 조 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// ============== 보상 처리 API ==============

// 활동 완료 및 보상 처리 (관리자)
router.post('/activities/:id/complete',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      const result = await activity.processRewards();
      res.json(result);
    } catch (error) {
      console.error('보상 처리 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);


module.exports = router;

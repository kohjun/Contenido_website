// routes/bingo/missions.js
// 미션 완료 토글 / 조정 (이전: routes/bingo.js)

const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Team = require('../../models/Team');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');

// 미션 완료 토글 (관리자)
router.post('/teams/:id/missions/:missionId/toggle',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      const progress = await team.toggleMission(
        parseInt(req.params.missionId), 
        req.user.id
      );
      
      res.json({ progress, bingoCount: team.bingoCount });
    } catch (error) {
      console.error('미션 토글 에러:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// 카운트 미션 조정 (관리자)
router.post('/teams/:id/missions/:missionId/adjust',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { increment } = req.body;
      const team = await Team.findById(req.params.id);
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      const progress = await team.adjustMissionCount(
        parseInt(req.params.missionId),
        increment,
        req.user.id
      );
      
      res.json({ progress, bingoCount: team.bingoCount });
    } catch (error) {
      console.error('미션 카운트 조정 에러:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// ============== 참가자용 API ==============


module.exports = router;

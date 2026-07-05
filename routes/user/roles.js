// routes/user/roles.js
// 역할 / 팀 / 스태프 소그룹 / 팀장 변경
// (이전: routes/user.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles, requireHRPermission } = require('../../middleware/roleMiddleware');
const User = require('../../models/User');
const { TEAM_TO_DEPARTMENT } = require('./_constants');

//역할 변경 업데이트
router.post('/update-role/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, team } = req.body;

    const validRoles = ['participant', 'starter', 'officer', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 역할입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const previousRole = user.role;
    const previousActive = user.active;

    const updateFields = { $set: { role } };

    if (role === 'officer') {
      // officer로 변경 시 team 필수, department는 team으로부터 자동 도출
      if (!team) {
        return res.status(400).json({ message: '운영진은 팀 선택이 필요합니다.' });
      }
      const department = TEAM_TO_DEPARTMENT[team];
      if (!department) {
        return res.status(400).json({ message: `알 수 없는 팀입니다: ${team}` });
      }
      updateFields.$set.department = department;
      updateFields.$set.team = team;
      updateFields.$set.isDepartmentHead = false;
    } else {
      // officer가 아닌 경우 부서/팀/팀장 필드 제거
      updateFields.$unset = {
        department: 1,
        team: 1,
        isDepartmentHead: 1
      };
    }

    // guest → participant 변경 시 자동 활성화
    let autoActivated = false;
    if (previousRole === 'guest' && role === 'participant' && !previousActive) {
      updateFields.$set.active = true;
      autoActivated = true;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    console.log(`사용자 ${userId} 역할 변경 완료: ${previousRole} → ${updatedUser.role}${autoActivated ? ' (자동 활성화)' : ''}`);
    res.status(200).json({
      message: '역할이 성공적으로 변경되었습니다.',
      role: updatedUser.role,
      department: updatedUser.department,
      team: updatedUser.team,
      active: updatedUser.active,
      autoActivated
    });
  } catch (error) {
    console.error(`역할 변경 중 오류:`, error);
    res.status(500).json({
      message: '역할 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 팀 변경 라우트
router.post('/update-team/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
      const { userId } = req.params;
      const { team } = req.body;
      let { department } = req.body;

      if (!team) {
          return res.status(400).json({ message: '팀이 지정되지 않았습니다.' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      // 팀 변경 가능한 대상: officer 또는 admin
      if (!['officer', 'admin'].includes(user.role)) {
          return res.status(400).json({ message: '운영진과 관리자만 팀을 변경할 수 있습니다.' });
      }

      // department가 누락되었으면 team에서 자동 도출
      if (!department) {
          department = TEAM_TO_DEPARTMENT[team];
          if (!department) {
              return res.status(400).json({ message: `알 수 없는 팀입니다: ${team}` });
          }
      }

      user.team = team;
      user.department = department;
      await user.save();

      console.log(`사용자 ${userId} 팀 변경 완료: 부서=${user.department}, 팀=${user.team}`);
      res.status(200).json({
          message: '팀이 성공적으로 변경되었습니다.',
          team: user.team,
          department: user.department
      });
  } catch (error) {
      console.error(`팀 변경 중 오류:`, error);
      res.status(500).json({
          message: '팀 변경 중 오류가 발생했습니다.',
          error: error.message
      });
  }
});

// 스태프 소그룹만 단독 변경 라우트
router.post('/update-staffsubteam/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
      const { userId } = req.params;
      const { staffSubteam } = req.body;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }
      if (user.role !== 'officer' || user.team !== 'staffTeam') {
          return res.status(400).json({ message: '스태프팀 소속 운영진만 소그룹을 변경할 수 있습니다.' });
      }
      if (staffSubteam === undefined) {
          return res.status(400).json({ message: '스태프 소그룹 값이 필요합니다.' });
      }

      user.staffSubteam = staffSubteam;
      await user.save();

      res.status(200).json({
          message: '스태프 소그룹이 성공적으로 변경되었습니다.',
          staffSubteam: user.staffSubteam
      });
  } catch (error) {
      console.error(`스태프 소그룹 변경 중 오류:`, error);
      res.status(500).json({ message: '스태프 소그룹 변경 중 오류가 발생했습니다.' });
  }
});

// 팀장 지정/해제 라우트 수정
router.post('/update-team-leader/:userId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { isTeamLeader } = req.body;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // officer만 팀장 지정 가능
        if (user.role !== 'officer') {
            return res.status(400).json({ message: '운영진만 팀장으로 지정할 수 있습니다.' });
        }

        user.isTeamLeader = isTeamLeader;
        await user.save();

        res.json({
            success: true,
            message: `팀장 ${isTeamLeader ? '지정' : '해제'}이 완료되었습니다.`
        });
    } catch (error) {
        console.error(`팀장 상태 업데이트 중 오류:`, error);
        res.status(500).json({ message: '팀장 상태 업데이트에 실패했습니다.' });
    }
});

module.exports = router;

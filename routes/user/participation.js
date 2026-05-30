// routes/user/participation.js
// 회원 목록 조회 + 활성 토글 + 참여 횟수 + 일괄 처리 (HR 멤버 관리)
// (이전: routes/user.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles, requireHRPermission } = require('../../middleware/roleMiddleware');
const User = require('../../models/User');

//여러 참가자 데이터 조회
router.get('/participants/users', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('displayName name participationCount profileImage status active role gender phonenumber warningCount team department preferredActivity birthDate isTeamLeader university createdAt staffSubteam workMemo');

    const userData = users.map(user => ({
      id: user._id,
      displayName: user.displayName,
      name: user.name,
      phonenumber: user.phonenumber,
      profileImage: user.profileImage || '/images/basic_Image.png',
      participationCount: user.participationCount,
      active: user.active,
      role: user.role,
      team: user.team,
      department: user.department,
      university: user.university,
      gender: user.gender || '-',
      warningCount: user.warningCount,
      preferredActivity: user.preferredActivity || '-',
      birthDate: user.birthDate,
      isTeamLeader: user.isTeamLeader,
      createdAt: user.createdAt,  // createdAt 추가
      staffSubteam: user.staffSubteam, // staffSubteam 추가
      workMemo: user.workMemo || ''
    }));

    res.status(200).json(userData);
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// ============== 빙고 시스템용 API 추가 ==============

// 기존 /participants/users 엔드포인트를 빙고 시스템에 맞게 수정 또는 새로 추가
router.get('/participants/bingo',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      // 활성 사용자 중 participant, starter, officer만 조회
      const users = await User.find({
        active: true,
        role: { $in: ['participant', 'starter', 'officer'] }
      }).select('name role birthDate gender department team');

      // 빙고 시스템에 맞는 형태로 데이터 가공
      const userData = users.map(user => {
        // 나이 계산 (한국식 나이)
        const age = user.birthDate ?
          new Date().getFullYear() - new Date(user.birthDate).getFullYear() + 1 : null;

        // 역할 한글 변환
        const roleMap = {
          'participant': '일반회원',
          'starter': '스타터',
          'officer': '운영진'
        };

        // 성별 한글 변환
        const genderMap = {
          'male': '남성',
          'female': '여성',
          'other': '기타'
        };

        return {
          id: user._id,
          name: user.name || '이름 없음',
          role: roleMap[user.role] || user.role,
          age: age,
          gender: genderMap[user.gender] || '미설정',
          department: user.department || '',
          team: user.team || ''
        };
      });

      res.json({
        success: true,
        count: userData.length,
        data: userData
      });

    } catch (error) {
      console.error('빙고 시스템 사용자 정보 조회 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  }
);

// POST
// 유저 활성 상태 토글
router.post('/toggle-active/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = active;
    await user.save();

    res.status(200).json({ message: 'User active status updated successfully' });
  } catch (error) {
    console.error(`활성화 상태 변경 중 오류:`, error);
    res.status(500).json({ message: 'Error updating user active status' });
  }
});

// 참가 횟수 업데이트
router.post('/update-participation/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { regularCount } = req.body;


    // 유효성 검사
    if (typeof regularCount !== 'number' || regularCount < 0) {
      return res.status(400).json({ message: '유효하지 않은 참가 횟수입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 참가 횟수 업데이트
    user.participationCount.regularCount = regularCount;
    await user.save();

    res.status(200).json({
      message: '참가 횟수가 업데이트되었습니다.',
      regularCount: user.participationCount.regularCount
    });
  } catch (error) {
    console.error(`참가 횟수 업데이트 중 오류:`, error);
    res.status(500).json({ message: '참가 횟수 업데이트 중 오류가 발생했습니다.' });
  }
});

// 일괄 업데이트 (참여횟수 / 경고)
router.post('/bulk-update', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userIds, action, amount, reason, category } = req.body;
    const issuedBy = req.user.id;
    const issuedByName = req.user.name;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: '선택된 사용자가 없습니다.' });
    }

    if (!['addParticipation', 'subtractParticipation', 'addWarning'].includes(action)) {
      return res.status(400).json({ message: '유효하지 않은 작업입니다.' });
    }

    const users = await User.find({ _id: { $in: userIds } });
    if (users.length === 0) {
      return res.status(404).json({ message: '대상 사용자를 찾을 수 없습니다.' });
    }

    let processed = 0;
    const errors = [];

    for (const user of users) {
      try {
        if (action === 'addParticipation') {
          const delta = Number(amount) || 1;
          if (!user.participationCount) {
            user.participationCount = { totalCount: 0, regularCount: 0 };
          }
          user.participationCount.regularCount = (user.participationCount.regularCount || 0) + delta;
          await user.save();
          processed++;
        } else if (action === 'subtractParticipation') {
          const delta = Number(amount) || 1;
          if (!user.participationCount) {
            user.participationCount = { totalCount: 0, regularCount: 0 };
          }
          user.participationCount.regularCount = Math.max(0, (user.participationCount.regularCount || 0) - delta);
          await user.save();
          processed++;
        } else if (action === 'addWarning') {
          if (!reason || reason.trim().length === 0) {
            errors.push({ userId: user._id, message: '경고 사유 누락' });
            continue;
          }
          const newWarning = {
            reason: reason.trim(),
            issuedBy,
            issuedByName,
            category: category || '기타',
            issuedAt: new Date()
          };
          user.warningHistory.push(newWarning);
          user.warningCount = (user.warningCount || 0) + 1;
          await user.save();
          processed++;
        }
      } catch (err) {
        console.error(`사용자 ${user._id} 일괄 업데이트 실패:`, err);
        errors.push({ userId: user._id, message: err.message });
      }
    }

    console.log(`일괄 업데이트 완료: ${action}, 처리됨 ${processed}/${users.length}`);

    res.status(200).json({
      message: `${processed}명에게 작업이 적용되었습니다.`,
      processed,
      total: users.length,
      errors
    });
  } catch (error) {
    console.error('일괄 업데이트 중 오류:', error);
    res.status(500).json({ message: '일괄 업데이트 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

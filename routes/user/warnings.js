// routes/user/warnings.js
// 경고 내역 조회 / 부여 / 삭제(비활성화)
// (이전: routes/user.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const { requireHRPermission } = require('../../middleware/roleMiddleware');
const User = require('../../models/User');
const { createNotification } = require('../../utils/notify');

// 경고 내역 조회
router.get('/warning-history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name warningCount warningHistory lastWarningResetDate');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 활성 경고만 필터링하거나 전체 내역 조회 옵션
    const showAll = req.query.showAll === 'true';
    const warningHistory = showAll
      ? user.warningHistory
      : user.warningHistory.filter(warning => warning.isActive);

    res.status(200).json({
      userName: user.name,
      currentWarningCount: user.warningCount,
      lastResetDate: user.lastWarningResetDate,
      warningHistory: warningHistory.map(warning => ({
        id: warning._id,
        reason: warning.reason,
        issuedByName: warning.issuedByName,
        issuedAt: warning.issuedAt,
        category: warning.category,
        isActive: warning.isActive
      }))
    });
  } catch (error) {
    console.error('경고 내역 조회 중 오류:', error);
    res.status(500).json({ message: '경고 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 경고 부여 - authorizeRoles 미들웨어 추가
router.post('/issue-warning/:userId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, category = '기타' } = req.body;
    const issuedBy = req.user.id;
    const issuedByName = req.user.name;

    // 유효성 검사
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: '경고 사유를 입력해주세요.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 새로운 경고 내역 생성
    const newWarning = {
      reason: reason.trim(),
      issuedBy,
      issuedByName,
      category,
      issuedAt: new Date()
    };

    // 경고 내역 추가 및 경고 횟수 증가
    user.warningHistory.push(newWarning);
    user.warningCount += 1;
    await user.save();

    // 경고 대상에게 알림 (비치명적)
    createNotification({
      userId,
      type: 'warning_issued',
      title: '경고가 부여되었습니다',
      body: reason ? `사유: ${reason}` : '',
      link: '/mypage.html',
      meta: { actorName: issuedByName, status: category },
    });

    console.log(`경고 부여 완료: ${user.name}(${userId}) - 사유: ${reason} - 부여자: ${issuedByName}`);

    res.status(200).json({
      message: '경고가 부여되었습니다.',
      warningCount: user.warningCount,
      newWarning: {
        reason: newWarning.reason,
        issuedByName: newWarning.issuedByName,
        issuedAt: newWarning.issuedAt,
        category: newWarning.category
      }
    });
  } catch (error) {
    console.error('경고 부여 중 오류:', error);
    res.status(500).json({ message: '경고 부여 중 오류가 발생했습니다.' });
  }
});


// 특정 경고 삭제/비활성화
router.post('/remove-warning/:userId/:warningId', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { userId, warningId } = req.params;
    const { reason = '관리자 판단' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const warning = user.warningHistory.id(warningId);
    if (!warning) {
      return res.status(404).json({ message: '해당 경고를 찾을 수 없습니다.' });
    }

    if (!warning.isActive) {
      return res.status(400).json({ message: '이미 비활성화된 경고입니다.' });
    }

    // 경고 비활성화 및 경고 횟수 감소
    warning.isActive = false;
    user.warningCount = Math.max(0, user.warningCount - 1);

    await user.save();

    console.log(`경고 삭제: ${user.name}(${userId}) - 삭제된 경고: ${warning.reason} - 삭제 사유: ${reason}`);

    res.status(200).json({
      message: '경고가 삭제되었습니다.',
      warningCount: user.warningCount
    });
  } catch (error) {
    console.error('경고 삭제 중 오류:', error);
    res.status(500).json({ message: '경고 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

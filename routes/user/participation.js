// routes/user/participation.js
// 회원 목록 조회 + 활성 토글 + 참여 횟수 + 일괄 처리 (HR 멤버 관리)
// (이전: routes/user.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const { requireHRPermission } = require('../../middleware/roleMiddleware');
const User = require('../../models/User');
const Event = require('../../models/Event');
const GlobalSetting = require('../../models/GlobalSetting');

// 운영진/관리자만 (멤버 목록은 여러 오피스 페이지가 공용으로 사용 → 최소한 비공개화)
const requireStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: '로그인이 필요합니다.' });
  if (req.user.role !== 'officer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: '운영진 또는 관리자만 조회할 수 있습니다.' });
  }
  next();
};

// 멤버 목록 조회 핸들러 (공유 — 이름/전화번호 등 PII 포함)
async function fetchMemberList(req, res) {
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
      createdAt: user.createdAt,
      staffSubteam: user.staffSubteam,
      workMemo: user.workMemo || ''
    }));

    res.status(200).json(userData);
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
}

// 공용 멤버 목록 — 운영진/관리자 로그인 필수 (event-staff·finance·organization 등에서 사용). 기존 '비로그인 공개' 취약점 차단.
router.get('/participants/users', authenticateToken, requireStaff, fetchMemberList);
// 인사팀 회원관리 전용 — 인사팀 운영진 또는 관리자만 (hr.js)
router.get('/participants/hr-members', authenticateToken, requireHRPermission, fetchMemberList);

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
    const { userIds, action, amount, reason, category, targetMonth } = req.body;
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
    let skipped = 0;
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
          // 같은 대상 월(月)에 이미 활성 경고가 있으면 중복 부여 방지
          if (targetMonth && (user.warningHistory || []).some(w => w.isActive && w.targetMonth === targetMonth)) {
            skipped++;
            continue;
          }
          const newWarning = {
            reason: reason.trim(),
            issuedBy,
            issuedByName,
            category: category || '기타',
            issuedAt: new Date(),
            targetMonth: targetMonth || null
          };
          user.warningHistory.push(newWarning);
          await user.save(); // warningCount는 pre-save 훅에서 활성 경고 수로 재계산됨
          processed++;
        }
      } catch (err) {
        console.error(`사용자 ${user._id} 일괄 업데이트 실패:`, err);
        errors.push({ userId: user._id, message: err.message });
      }
    }

    console.log(`일괄 업데이트 완료: ${action}, 처리됨 ${processed}/${users.length}, 중복제외 ${skipped}`);

    const msg = skipped > 0
      ? `${processed}명에게 적용 (이미 ${targetMonth} 경고가 있어 ${skipped}명 제외)`
      : `${processed}명에게 작업이 적용되었습니다.`;
    res.status(200).json({
      message: msg,
      processed,
      skipped,
      total: users.length,
      errors
    });
  } catch (error) {
    console.error('일괄 업데이트 중 오류:', error);
    res.status(500).json({ message: '일괄 업데이트 중 오류가 발생했습니다.' });
  }
});

// 월간 신청 의무 기간 조회 헬퍼
async function getMonthlyPeriod() {
  const setting = await GlobalSetting.findOne({ key: 'monthlyApplicationPeriod' });
  if (setting && setting.value) {
    return {
      startDay: setting.value.startDay || 1,
      endDay: setting.value.endDay || 5
    };
  }
  return { startDay: 1, endDay: 5 };
}

// 1) 월간 신청 기간 설정 조회 API (일반 부원도 events.html에서 보여줘야 하므로 인증만 통과하면 가능)
router.get('/monthly-application-period', authenticateToken, async (req, res) => {
  try {
    const period = await getMonthlyPeriod();
    res.json(period);
  } catch (error) {
    console.error('Error fetching monthly application period:', error);
    res.status(500).json({ message: '설정 조회 중 오류가 발생했습니다.' });
  }
});

// 2) 월간 신청 기간 설정 저장 API (인사팀/관리자만)
router.post('/monthly-application-period', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const { startDay, endDay } = req.body;
    const start = parseInt(startDay);
    const end = parseInt(endDay);

    if (isNaN(start) || isNaN(end) || start < 1 || start > 31 || end < 1 || end > 31 || start > end) {
      return res.status(400).json({ message: '올바른 시작일과 마감일을 입력해주세요. (1~31일, 시작일 <= 마감일)' });
    }

    await GlobalSetting.findOneAndUpdate(
      { key: 'monthlyApplicationPeriod' },
      { value: { startDay: start, endDay: end } },
      { upsert: true, new: true }
    );

    res.json({ message: '신청 기간 설정이 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('Error saving monthly application period:', error);
    res.status(500).json({ message: '설정 저장 중 오류가 발생했습니다.' });
  }
});

// 이번 달 이벤트에 설정된 기간 내에 신청했는지로 회원 분류 (인사팀 월간 신청 현황)
//  - 대상: 활동 중(active)인 참가자/스타터 (월간 신청 의무 대상)
//  - 기준: 그 달에 진행되는 이벤트(event.date in month)에, 설정된 시작일~마감일 사이 appliedAt(취소 제외)
router.get('/monthly-application-status', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const period = await getMonthlyPeriod();
    const startDay = period.startDay;
    const endDay = period.endDay;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const nextMonthStart = new Date(year, month + 1, 1, 0, 0, 0, 0);
    const windowStart = new Date(year, month, startDay, 0, 0, 0, 0);
    const windowEnd = new Date(year, month, endDay + 1, 0, 0, 0, 0); // 마감 다음 날 00:00

    // 이번 달에 진행되는 이벤트
    const events = await Event.find({ date: { $gte: monthStart, $lt: nextMonthStart } })
      .select('appliedParticipants').lean();

    // 신청 시점 분류 (취소 제외):
    //  - 신청 완료: 마감 전에 신청 = appliedAt < windowEnd
    //  - 지각: 마감 이후 신청
    const onTimeSet = new Set();  // appliedAt < windowEnd (마감 전)
    const lateMap = new Map();    // userId -> 가장 이른 지각(>= windowEnd) appliedAt
    for (const ev of events) {
      for (const p of (ev.appliedParticipants || [])) {
        if (!p.userId || p.status === 'cancelled') continue; // 취소건은 집계 제외
        const at = p.appliedAt ? new Date(p.appliedAt) : null;
        if (!at) continue;
        const uid = p.userId.toString();
        if (at < windowEnd) {
          onTimeSet.add(uid);
        } else if (at < nextMonthStart) {
          const prev = lateMap.get(uid);
          if (!prev || at < prev) lateMap.set(uid, at);
        }
      }
    }

    // 월간 신청 의무 대상: 활동 중인 참가자/스타터
    const members = await User.find({ active: true, role: { $in: ['participant', 'starter'] } })
      .select('name displayName role team university phonenumber createdAt').lean();

    const fmt = (m, lateAt) => {
      const digits = String(m.phonenumber || '').replace(/[^0-9]/g, '');
      return {
        id: m._id,
        name: m.name || m.displayName || '이름없음',
        role: m.role,
        team: m.team || null,
        university: m.university || null,
        phoneTail: digits.length >= 4 ? digits.slice(-4) : digits, // 뒷 4자리만 (전체번호 미반환)
        lateAt: lateAt ? new Date(lateAt).toISOString() : null
      };
    };

    // 그달 마감일 이후(>= 마감일 0시) 가입자는 면제 — 신청 기간을 온전히 누리지 못함
    const exemptThreshold = new Date(year, month, endDay, 0, 0, 0, 0);
    let exemptCount = 0;
    const applied = [];      // 정시 (~5일)
    const lateApplied = [];  // 지각 (6일 이후)
    const notApplied = [];   // 전혀 신청 안 함
    for (const m of members) {
      if (m.createdAt && new Date(m.createdAt) >= exemptThreshold) { exemptCount++; continue; }
      const uid = m._id.toString();
      if (onTimeSet.has(uid)) applied.push(fmt(m));
      else if (lateMap.has(uid)) lateApplied.push(fmt(m, lateMap.get(uid)));
      else notApplied.push(fmt(m));
    }
    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko');
    applied.sort(byName);
    lateApplied.sort(byName);
    notApplied.sort(byName);

    res.json({
      year,
      month: month + 1,
      windowStart,
      windowEnd,
      windowClosed: now >= windowEnd, // 6일 자정 지났는지
      eventCount: events.length,
      exemptCount,
      appliedCount: applied.length,
      lateCount: lateApplied.length,
      notAppliedCount: notApplied.length,
      applied,
      lateApplied,
      notApplied
    });
  } catch (error) {
    console.error('월간 신청 현황 조회 오류:', error);
    res.status(500).json({ message: '월간 신청 현황 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

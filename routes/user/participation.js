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
const Supporter = require('../../models/Supporter');
const StarterStaff = require('../../models/StarterStaff');

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
    const users = await User.find({ isVerified: { $ne: false } })
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
          // 스타터-스태프인 경우 매번 경고 면제 처리
          const starterStaffDoc = await StarterStaff.findOne().lean();
          const isStarterStaff = starterStaffDoc && starterStaffDoc.memberIds.some(id => id.toString() === user._id.toString());
          if (isStarterStaff) {
            skipped++;
            continue;
          }

          // 해당 월/주기 서포터즈 경고 면제 처리
          let targetY = new Date().getFullYear();
          let targetMonths = [new Date().getMonth() + 1];
          if (targetMonth && targetMonth.includes('-')) {
            const parts = targetMonth.split('-');
            targetY = parseInt(parts[0]) || targetY;
            if (parts[1].includes('~')) {
              const mParts = parts[1].split('~').map(x => parseInt(x)).filter(x => !isNaN(x));
              targetMonths = mParts;
            } else {
              targetMonths = [parseInt(parts[1]) || (new Date().getMonth() + 1)];
            }
          }
          const prevM = targetMonths[0] === 1 ? 12 : targetMonths[0] - 1;
          if (!targetMonths.includes(prevM)) targetMonths.push(prevM);

          const supporterDocs = await Supporter.find({
            year: targetY,
            month: { $in: targetMonths }
          }).lean();

          const supporterSetBulk = new Set();
          supporterDocs.forEach(doc => {
            (doc.memberIds || []).forEach(id => supporterSetBulk.add(id.toString()));
          });

          if (supporterSetBulk.has(user._id.toString())) {
            skipped++;
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

// 2026년 학기 중/방학 월간 신청 주기 블록 헬퍼 함수
function getApplicationCycleBlock(year, month) {
  let months;
  let type; // 'single' | 'bi-monthly'
  let label;
  let warningTargetMonth;

  if (month === 1) {
    months = [1];
    type = 'single';
    label = '1월';
    warningTargetMonth = `${year}-01`;
  } else if (month === 2) {
    months = [2];
    type = 'single';
    label = '2월';
    warningTargetMonth = `${year}-02`;
  } else if (month === 3 || month === 4) {
    months = [3, 4];
    type = 'bi-monthly';
    label = '3~4월';
    warningTargetMonth = `${year}-03~04`;
  } else if (month === 5 || month === 6) {
    months = [5, 6];
    type = 'bi-monthly';
    label = '5~6월';
    warningTargetMonth = `${year}-05~06`;
  } else if (month === 7) {
    months = [7];
    type = 'single';
    label = '7월';
    warningTargetMonth = `${year}-07`;
  } else if (month === 8) {
    months = [8];
    type = 'single';
    label = '8월';
    warningTargetMonth = `${year}-08`;
  } else if (month === 9 || month === 10) {
    months = [9, 10];
    type = 'bi-monthly';
    label = '9~10월';
    warningTargetMonth = `${year}-09~10`;
  } else if (month === 11 || month === 12) {
    months = [11, 12];
    type = 'bi-monthly';
    label = '11~12월';
    warningTargetMonth = `${year}-11~12`;
  } else {
    months = [month];
    type = 'single';
    label = `${month}월`;
    warningTargetMonth = `${year}-${String(month).padStart(2, '0')}`;
  }

  const isFirstMonth = months.length === 1 || month === months[0];
  const isLastMonth = months.length === 1 || month === months[months.length - 1];

  return {
    type,
    label,
    months,
    isFirstMonth,
    isLastMonth,
    warningTargetMonth
  };
}

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

// 1) 월간 신청 기간 설정 조회 API (로그인하지 않은 방문자도 events.html에서 봐야 하므로 전체 공개)
router.get('/monthly-application-period', async (req, res) => {
  try {
    const period = await getMonthlyPeriod();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    const cycle = getApplicationCycleBlock(year, month);
    res.json({
      ...period,
      year,
      month,
      cycle
    });
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

// 3) 회원 분류 및 월간 신청 현황 (인사팀 월간 신청 현황)
//  - 2026년 학기 중(3~4월, 5~6월, 9~10월, 11~12월) 2개월 1회 완화 주기 지원
//  - 방학 기간(1월, 2월, 7월, 8월) 1개월 1회 주기 지원
router.get('/monthly-application-status', authenticateToken, requireHRPermission, async (req, res) => {
  try {
    const period = await getMonthlyPeriod();
    const startDay = period.startDay;
    const endDay = period.endDay;

    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const currentMonthNum = req.query.month ? parseInt(req.query.month) : (now.getMonth() + 1); // 1-12
    const month = currentMonthNum - 1; // 0-indexed

    const cycle = getApplicationCycleBlock(year, currentMonthNum);

    const windowStart = new Date(year, month, startDay, 0, 0, 0, 0);
    const windowEnd = new Date(year, month, endDay + 1, 0, 0, 0, 0); // 마감 다음 날 00:00
    const windowClosed = now >= windowEnd;

    // 해당 주기에 포함되어 조회할 월 목록 (단일월: [month], 2개월 블록: 1번째 달이면 [m1], 2번째 달이면 [m1, m2])
    let queryMonths = [currentMonthNum];
    if (cycle.type === 'bi-monthly' && cycle.isLastMonth) {
      // 2번째 달(예: 10월)인 경우 9월과 10월 이벤트를 모두 조회하여 2달 중 1회라도 신청했는지 확인
      queryMonths = cycle.months;
    }

    // 각 대상 월별 이벤트 조회
    const monthRanges = queryMonths.map(mNum => {
      const mIdx = mNum - 1;
      return {
        mNum,
        start: new Date(year, mIdx, 1, 0, 0, 0, 0),
        nextStart: new Date(year, mIdx + 1, 1, 0, 0, 0, 0),
        wEnd: new Date(year, mIdx, endDay + 1, 0, 0, 0, 0)
      };
    });

    const overallStart = monthRanges[0].start;
    const overallEnd = monthRanges[monthRanges.length - 1].nextStart;

    const events = await Event.find({ date: { $gte: overallStart, $lt: overallEnd } })
      .select('title date appliedParticipants isLightning').lean();

    // 유저별 온타임 신청 여부 및 지각 신청 정보 수집
    const onTimeSet = new Set();
    const lateMap = new Map(); // uid -> latest appliedAt

    for (const ev of events) {
      const evDate = new Date(ev.date);
      const evMonthNum = evDate.getMonth() + 1;
      const evMonthRange = monthRanges.find(r => r.mNum === evMonthNum) || {
        wEnd: new Date(evDate.getFullYear(), evDate.getMonth(), endDay + 1, 0, 0, 0, 0),
        nextStart: new Date(evDate.getFullYear(), evDate.getMonth() + 1, 1, 0, 0, 0, 0)
      };

      for (const p of (ev.appliedParticipants || [])) {
        if (!p.userId || p.status === 'cancelled') continue;
        const at = p.appliedAt ? new Date(p.appliedAt) : null;
        if (!at) continue;
        const uid = p.userId.toString();

        // 번개주최이벤트인 경우, 해당 월이 이미 지났다면 반드시 해당 월 내에 인증이 제출되어 있어야 인정
        if (ev.isLightning) {
          if (now >= evMonthRange.nextStart) {
            if (!p.verification || !p.verification.submittedAt) continue;
            const submittedAt = new Date(p.verification.submittedAt);
            if (submittedAt >= evMonthRange.nextStart) continue;
          }
        }

        if (at < evMonthRange.wEnd) {
          onTimeSet.add(uid);
        } else if (at < evMonthRange.nextStart) {
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
        phoneTail: digits.length >= 4 ? digits.slice(-4) : digits,
        lateAt: lateAt ? new Date(lateAt).toISOString() : null
      };
    };

    // 서포터즈 명단 조회 (해당 주기 범위 내 및 직전월 포함)
    let supporterQueryMonths = [currentMonthNum];
    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    supporterQueryMonths.push(prevMonthNum);
    if (cycle.type === 'bi-monthly') {
      cycle.months.forEach(m => { if (!supporterQueryMonths.includes(m)) supporterQueryMonths.push(m); });
    }

    const supporterDocs = await Supporter.find({
      year,
      month: { $in: supporterQueryMonths }
    }).lean();

    const supporterSet = new Set();
    supporterDocs.forEach(doc => {
      (doc.memberIds || []).forEach(id => supporterSet.add(id.toString()));
    });

    // 스타터-스태프 명단 조회 (매번 경고 면제)
    const starterStaffDoc = await StarterStaff.findOne().lean();
    const starterStaffSet = new Set((starterStaffDoc?.memberIds || []).map(id => id.toString()));

    // 마감일 이후(>= 마감일 0시) 가입자는 면제
    const exemptThreshold = new Date(year, month, endDay, 0, 0, 0, 0);
    let exemptCount = 0;
    const applied = [];      // 정시 신청
    const lateApplied = [];  // 지각 신청
    const notApplied = [];   // 미신청

    for (const m of members) {
      if (m.createdAt && new Date(m.createdAt) >= exemptThreshold) { exemptCount++; continue; }
      const uid = m._id.toString();
      const item = fmt(m);

      if (starterStaffSet.has(uid)) {
        item.isStarterStaff = true;
        item.isExempt = true;
      }
      if (supporterSet.has(uid)) {
        item.isSupporter = true;
        item.isExempt = true;
      }

      if (onTimeSet.has(uid)) {
        applied.push(item);
      } else if (lateMap.has(uid)) {
        item.lateAt = lateMap.get(uid) ? new Date(lateMap.get(uid)).toISOString() : null;
        lateApplied.push(item);
      } else {
        notApplied.push(item);
      }
    }

    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko');
    applied.sort(byName);
    lateApplied.sort(byName);
    notApplied.sort(byName);

    const warnTargetNotAppliedCount = notApplied.filter(m => !m.isExempt).length;
    const exemptSupporterCount = notApplied.filter(m => m.isSupporter).length;
    const exemptStarterStaffCount = notApplied.filter(m => m.isStarterStaff).length;
    const totalExemptInNotApplied = exemptSupporterCount + exemptStarterStaffCount;

    // 2개월 주기의 1번째 달(예: 9월)인 경우 경고 부여 불가 (2번째 달 마감 후 일괄 경고)
    let canWarn = false;
    let warnReason = '';

    if (cycle.type === 'single') {
      canWarn = windowClosed && events.length > 0;
      warnReason = events.length === 0 ? '이번 달 이벤트가 없어 경고를 부여할 수 없습니다.'
                 : !windowClosed ? `신청 기간 진행 중 — ${endDay + 1}일 이후 경고할 수 있습니다.`
                 : '';
    } else if (cycle.type === 'bi-monthly') {
      if (cycle.isFirstMonth) {
        canWarn = false;
        warnReason = `${cycle.label} 2개월 완화 주기 진행 중 — ${cycle.months[1]}월 마감 후 미신청자에게 일괄 경고가 부과됩니다.`;
      } else {
        canWarn = windowClosed && events.length > 0;
        warnReason = events.length === 0 ? `${cycle.label} 이벤트가 없어 경고를 부여할 수 없습니다.`
                   : !windowClosed ? `${currentMonthNum}월 신청 기간 진행 중 — ${endDay + 1}일 이후 경고할 수 있습니다.`
                   : '';
      }
    }

    res.json({
      year,
      month: currentMonthNum,
      cycle: {
        type: cycle.type,
        label: cycle.label,
        months: cycle.months,
        isFirstMonth: cycle.isFirstMonth,
        isLastMonth: cycle.isLastMonth,
        warningTargetMonth: cycle.warningTargetMonth
      },
      windowStart,
      windowEnd,
      windowClosed,
      canWarn,
      warnReason,
      eventCount: events.length,
      exemptCount,
      supportersCount: exemptSupporterCount,
      starterStaffCount: exemptStarterStaffCount,
      totalExemptInNotApplied,
      appliedCount: applied.length,
      lateCount: lateApplied.length,
      notAppliedCount: warnTargetNotAppliedCount,
      totalNotAppliedCount: notApplied.length,
      applied,
      lateApplied,
      notApplied
    });
  } catch (error) {
    console.error('월간 신청 현황 조회 오류:', error);
    res.status(500).json({ message: '월간 신청 현황 조회 중 오류가 발생했습니다.' });
  }
});

router.getApplicationCycleBlock = getApplicationCycleBlock;
module.exports = router;

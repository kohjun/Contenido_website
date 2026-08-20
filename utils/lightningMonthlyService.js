// utils/lightningMonthlyService.js
// 매달 1일 번개주최 이벤트 자동 생성 및 전달 번개주최 이벤트 정산/경고/삭제 모듈

const Event = require('../models/Event');
const User = require('../models/User');

const LIGHTNING_CONTENTS = `공식 이벤트에 참가가 어려운 부원분들은 '번개주최'를 통해 '월간 신청 의무'를 대체할 수 있습니다.

콘테니도에서는 참가자가 직접 소규모 이벤트(번개)를 기획하고 운영할 수 있습니다.

번개 주최를 희망하는 참가자는 본 이벤트에 신청해 주시기 바랍니다.

## 신청 대상

* 해당 월에 직접 번개를 주최하고자 하는 참가자
* 번개 진행 및 인증이 가능한 참가자

# 진행 절차
1. 본 이벤트 신청 -> 자동승인
3. 해당 월 내 번개 진행 (최소 인원 4명)
4. 월말까지 인증 제출
5. 인증 확인 후 해당 월 이벤트 신청 의무 이행으로 인정

## 인정 기준

다음 조건을 모두 충족해야 인정됩니다.

* 해당 월 내 실제 진행되었을 것
* 월말까지 인증을 완료할 것
* 최소 참여 인원 기준을 충족할 것(4명)

## 인증 방법
번개 종료 후 아래 내용을 제출해 주시기 바랍니다.

* 사담방에 올린 번개내용( 제목, 진행 일시 ,진행장소)
* 참가자 명단
* 활동 사진 또는 결제내역

## 주의사항

* 사전 신청 없이 진행한 번개는 공식 활동으로 인정되지 않습니다.
* 월말까지 인증하지 않을 경우 인정되지 않습니다.
* 허위 인증 또는 허위 참여 명단 제출 시 경고 또는 활동 제한 조치가 이루어질 수 있습니다.
* 이벤트성 스터디 번개는 기존 운영 방식을 유지합니다.


월초 공식 이벤트 신청 기간에 본 이벤트를 신청한 후, 해당 월 내 번개를 진행하고 월말까지 인증을 완료해야 월간 이벤트 신청 의무를 이행한 것으로 인정됩니다. 이를 수행하지 않을 시에는 경고가 부여될 수 있습니다.

콘테니도는 직접 콘텐츠를 만들고 운영하는 문화를 지향합니다. 많은 참여 부탁드립니다.`;

/**
 * 이번 달 번개주최 이벤트 자동 생성
 * @param {Date} targetDate 
 */
async function createCurrentMonthLightningEvent(targetDate = new Date()) {
  try {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // 1 ~ 12
    const title = `${month}월 번개주최[월간 신청 의무 대체]`;

    // 1. 이미 존재 여부 확인
    const existing = await Event.findOne({ isLightning: true, title });
    if (existing) {
      console.log(`[LightningMonthly] 이번 달 번개주최 이벤트가 이미 존재합니다: "${title}" (${existing._id})`);
      return existing;
    }

    // 2. 날짜 계산 (해당 월 1일 ~ 해당 월 마지막 날 23:59:59)
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. 생성자(Admin 유저) 찾기
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.warn('[LightningMonthly] Admin 유저를 찾을 수 없습니다. creator 설정이 제한될 수 있습니다.');
    }
    const creatorId = adminUser ? adminUser._id : null;

    // 4. 이벤트 생성
    const newEvent = new Event({
      team: '기획팀',
      title,
      date: monthEnd,
      place: '자율 장소',
      participants: 50,
      startTime: '00:00',
      endTime: '23:59',
      participation_fee: 0,
      contents: LIGHTNING_CONTENTS,
      creator: creatorId,
      isLightning: true,
      accessCode: '5422',
      hasParticipantRules: false,
      applicationStartAt: monthStart,
      applicationDeadlineAt: monthEnd,
      confirmationDeadlineAt: monthEnd,
      maxApplicants: 50,
      feeType: 'fixed'
    });

    await newEvent.save();
    console.log(`[LightningMonthly] 새로운 번개주최 이벤트 생성 완료: "${title}" (${newEvent._id})`);
    return newEvent;
  } catch (error) {
    console.error('[LightningMonthly] 이번 달 번개주최 이벤트 생성 실패:', error);
    throw error;
  }
}

/**
 * 전달 번개주최 이벤트 정산 및 경고 처리 후 삭제
 * @param {Date} currentDate 
 */
async function processPrevMonthLightningEvents(currentDate = new Date()) {
  try {
    const currYear = currentDate.getFullYear();
    const currMonth = currentDate.getMonth() + 1;

    const prevYear = currMonth === 1 ? currYear - 1 : currYear;
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    
    const { getApplicationCycleBlock } = require('../routes/user/participation');
    const cycle = getApplicationCycleBlock ? getApplicationCycleBlock(prevYear, prevMonth) : { type: 'single', warningTargetMonth: `${prevYear}-${String(prevMonth).padStart(2, '0')}`, isFirstMonth: true, isLastMonth: true };
    const targetMonthStr = cycle.warningTargetMonth || `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const prevMonthStart = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // 전달 번개주최 이벤트 찾기
    const prevEvents = await Event.find({
      isLightning: true,
      title: { $regex: '번개주최' },
      date: { $gte: prevMonthStart, $lte: prevMonthEnd }
    });

    if (prevEvents.length === 0) {
      console.log(`[LightningMonthly] 정산할 전달(${targetMonthStr}) 번개주최 이벤트가 없습니다.`);
      return;
    }

    const adminUser = await User.findOne({ role: 'admin' });

    for (const event of prevEvents) {
      console.log(`[LightningMonthly] 전달 번개주최 이벤트 정산 시작: "${event.title}" (${event._id})`);
      const adminId = adminUser ? adminUser._id : event.creator;
      const adminName = adminUser ? (adminUser.name || adminUser.displayName || 'System') : 'System';

      const participants = event.appliedParticipants || [];
      for (const p of participants) {
        if (p.status === 'cancelled' || p.isGuest || !p.userId) continue;

        const user = await User.findById(p.userId);
        if (!user) continue;

        const isVerifiedAndApproved = p.verification && p.verification.status === 'approved';

        if (isVerifiedAndApproved) {
          // (A) 인증을 하고 2차 승인이 된 경우: 전달에 경고가 부여되어 있으면 없애줌
          const existingWarning = (user.warningHistory || []).find(
            w => w.isActive && (w.targetMonth === targetMonthStr || w.targetMonth === `${prevYear}-${String(prevMonth).padStart(2, '0')}`)
          );
          if (existingWarning) {
            existingWarning.isActive = false;
            existingWarning.removedAt = new Date();
            existingWarning.removedByName = 'System';
            existingWarning.removalReason = '번개주최 인증 및 2차 승인 완료에 따른 경고 취소';

            user.warningCount = user.getActiveWarningCount();
            await user.save();
            console.log(`[LightningMonthly] 회원 ${user.name}(${user._id})의 ${targetMonthStr} 경고 취소 처리 완료`);
          }
        } else {
          // (B) 인증을 하지 않았거나 승인이 되지 않은 사람:
          // 2개월 주기의 첫 번째 달인 경우 경고 유예 (2번째 달에 다시 신청 기회 제공)
          if (cycle.type === 'bi-monthly' && cycle.isFirstMonth) {
            console.log(`[LightningMonthly] 회원 ${user.name}(${user._id})는 ${cycle.label} 2개월 완화 주기 첫 달 미인증으로 경고 유예 처리됩니다.`);
            continue;
          }

          // 전달 경고가 이미 부여되어 있으면 넘어감, 없으면 의무신청/이행 하지 않은 것으로 간주하여 경고 부여
          const existingWarning = (user.warningHistory || []).find(
            w => w.isActive && (w.targetMonth === targetMonthStr || w.targetMonth === `${prevYear}-${String(prevMonth).padStart(2, '0')}`)
          );
          if (existingWarning) {
            console.log(`[LightningMonthly] 회원 ${user.name}(${user._id})는 ${targetMonthStr} 경고가 이미 존재하여 넘어갑니다.`);
          } else {
            user.warningHistory.push({
              reason: `${cycle.label || `${prevMonth}월`} 번개주최 미인증/미승인 (월간 신청 의무 미이행)`,
              category: '월간미신청',
              targetMonth: targetMonthStr,
              issuedBy: adminId,
              issuedByName: adminName,
              issuedAt: new Date(),
              isActive: true
            });
            user.warningCount = user.getActiveWarningCount();
            await user.save();
            console.log(`[LightningMonthly] 회원 ${user.name}(${user._id})에게 ${targetMonthStr} 월간 미이행 경고 부여 완료`);
          }
        }
      }

      // 정산 후 이벤트 삭제
      await Event.findByIdAndDelete(event._id);
      console.log(`[LightningMonthly] 전달 번개주최 이벤트 삭제 완료: "${event.title}" (${event._id})`);
    }
  } catch (error) {
    console.error('[LightningMonthly] 전달 번개주최 이벤트 정산/삭제 처리 실패:', error);
    throw error;
  }
}

/**
 * 매달 1일 정각 종합 실행 함수 (정산 후 생성)
 * @param {Date} currentDate 
 */
async function runMonthlyLightningTask(currentDate = new Date()) {
  console.log(`[LightningMonthly] 월간 번개주최 작업 시작 (${currentDate.toISOString()})`);
  await processPrevMonthLightningEvents(currentDate);
  await createCurrentMonthLightningEvent(currentDate);
  console.log(`[LightningMonthly] 월간 번개주최 작업 완료`);
}

module.exports = {
  createCurrentMonthLightningEvent,
  processPrevMonthLightningEvents,
  runMonthlyLightningTask
};

// utils/SchedulerService.js - 빙고 보상 처리 추가된 버전

const schedule = require('node-schedule');
const User = require('../models/User');
const { createManyNotifications } = require('./notify');

// ============== 기존 스케줄러들 ==============

// 매년 1월 1일, 7월 1일 오전 1시에 실행되는 경고 초기화 스케줄러
const resetWarningCounts = schedule.scheduleJob('0 1 1 1,7 *', async () => {
  try {
    console.log(`[${new Date()}] 경고 횟수 리셋 및 역할 변경 시작.`);
    
    // 경고가 2회 이상인 사용자들을 찾아서 처리
    const usersWithHighWarnings = await User.find({ warningCount: { $gte: 2 } });
    
    let roleChangedCount = 0;
    let warningsResetCount = 0;
    
    // 모든 사용자의 경고 초기화
    const allUsers = await User.find({});
    
    for (const user of allUsers) {
      // 경고가 2회 이상이면 role을 guest로 변경
      if (user.warningCount >= 2) {
        user.role = 'guest';
        roleChangedCount++;
      }
      
      // 경고 내역 초기화 (새로운 메서드 사용)
      if (user.warningCount > 0) {
        await user.resetWarnings();
        warningsResetCount++;
      }
    }
    
    console.log(`Role changes completed. Modified ${roleChangedCount} users to guest.`);
    console.log(`Warning count reset completed. Modified ${warningsResetCount} users.`);
  } catch (error) {
    console.error('Error resetting warning counts:', error);
  }
});

// 매분기(1, 4, 7, 10월) 1일 정각(00:00)에 실행되는 정기 참가 횟수(regularCount) 초기화 스케줄러
const resetRegularCounts = schedule.scheduleJob('0 0 1 1,4,7,10 *', async () => {
  try {
    console.log(`[${new Date()}] 분기별 정기 참가 횟수(regularCount) 리셋 및 totalCount 이관 시작.`);
    
    const users = await User.find({});
    let updatedCount = 0;
    
    for (const user of users) {
      if (!user.participationCount) {
        user.participationCount = { totalCount: 0, regularCount: 0 };
      }
      
      const regular = user.participationCount.regularCount || 0;
      user.participationCount.totalCount = (user.participationCount.totalCount || 0) + regular;
      user.participationCount.regularCount = 0;
      
      await user.save();
      updatedCount++;
    }
    
    console.log(`[${new Date()}] 분기별 정기 참가 횟수 리셋 완료. 총 ${updatedCount}명 처리됨.`);
  } catch (error) {
    console.error('Error resetting regular counts:', error);
  }
});

// ============== 새로 추가: 이벤트 자동 참가자 확정 스케줄러 ==============
// 매 5분마다 실행 — confirmationDeadlineAt이 지난 이벤트의 pending 신청자를
// 성비 1:1 우선, 어린 사람 우선으로 자동 승인.

const processEventAutoConfirmations = schedule.scheduleJob('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const Event = require('../models/Event');

    const events = await Event.find({
      confirmationDeadlineAt: { $ne: null, $lte: now },
      autoConfirmedAt: null,
      isEnded: false
    }).populate('appliedParticipants.userId', 'gender birthDate name');

    if (events.length === 0) return;

    console.log(`[${now.toISOString()}] 자동 참가자 확정 대상 이벤트: ${events.length}개`);

    for (const event of events) {
      try {
        const capacity  = event.participants;
        const approved  = event.appliedParticipants.filter(p => p.status === 'approved');
        const remaining = capacity - approved.length;

        if (remaining <= 0) {
          event.autoConfirmedAt = now;
          await event.save();
          console.log(`  - ${event.title}: 이미 정원(${capacity}) 채워짐, 스킵`);
          continue;
        }

        const pending = event.appliedParticipants.filter(p => p.status === 'pending');
        if (pending.length === 0) {
          event.autoConfirmedAt = now;
          await event.save();
          console.log(`  - ${event.title}: pending 신청자 없음, 스킵`);
          continue;
        }

        // 정렬: 어린 사람 우선(birthDate desc), tiebreak appliedAt asc
        const compare = (a, b) => {
          const aBirth = a.userId?.birthDate ? new Date(a.userId.birthDate).getTime() : 0;
          const bBirth = b.userId?.birthDate ? new Date(b.userId.birthDate).getTime() : 0;
          if (aBirth !== bBirth) return bBirth - aBirth;
          return new Date(a.appliedAt) - new Date(b.appliedAt);
        };

        const male   = pending.filter(p => p.userId?.gender === 'male').sort(compare);
        const female = pending.filter(p => p.userId?.gender === 'female').sort(compare);
        const other  = pending
          .filter(p => p.userId?.gender !== 'male' && p.userId?.gender !== 'female')
          .sort(compare);

        // 성비 1:1 greedy 할당 (takeM, takeF 균형 유지, 부족하면 반대편에서 채움)
        let takeM = 0, takeF = 0;
        let mIdx = 0, fIdx = 0;
        let slotsLeft = remaining;

        while (slotsLeft > 0 && (mIdx < male.length || fIdx < female.length)) {
          if (mIdx < male.length && (takeM <= takeF || fIdx >= female.length)) {
            takeM++; mIdx++; slotsLeft--;
          } else if (fIdx < female.length) {
            takeF++; fIdx++; slotsLeft--;
          } else {
            break;
          }
        }

        const selected = [
          ...male.slice(0, takeM),
          ...female.slice(0, takeF),
        ];

        // 그래도 자리 남으면 other에서 채움 (어린 순)
        if (slotsLeft > 0 && other.length > 0) {
          const take = Math.min(slotsLeft, other.length);
          selected.push(...other.slice(0, take));
          slotsLeft -= take;
        }

        // 선발자 status='approved' 처리 + 이력 기록
        for (const p of selected) {
          if (!p.statusHistory) p.statusHistory = [];
          p.statusHistory.push({
            previousStatus: p.status || 'pending',
            newStatus: 'approved',
            changedBy: event.creator,
            changerName: 'system-auto',
            changedAt: now,
            isReset: false
          });
          p.status = 'approved';
        }

        event.autoConfirmedAt = now;
        await event.save();

        // 자동 확정된 참가자들에게 일괄 알림 (비치명적, insertMany 1회)
        if (selected.length > 0) {
          await createManyNotifications(selected.map(p => ({
            userId: (p.userId && p.userId._id) || p.userId,
            type: 'auto_confirmed',
            title: `[${event.title}] 참가가 확정되었습니다`,
            link: '/mypage.html',
            meta: { eventId: event._id, eventTitle: event.title, actorName: 'system-auto', status: 'approved' },
          })));
        }

        const takeOther = selected.length - takeM - takeF;
        console.log(`  - ${event.title}: ${selected.length}명 자동 확정 (남:${takeM} 여:${takeF} 그외:${takeOther})`);
      } catch (eventError) {
        console.error(`  - 이벤트 ${event._id} 자동 확정 오류:`, eventError);
      }
    }
  } catch (error) {
    console.error('자동 참가자 확정 스케줄러 오류:', error);
  }
});

// ============== 스케줄러 상태 확인 함수 ==============

const getSchedulerStatus = () => {
  return {
    schedulers: [
      {
        name: 'resetWarningCounts',
        description: '경고 횟수 리셋 및 역할 변경 (매년 1·7월 1일 01:00)',
        schedule: '0 1 1 1,7 *',
        nextRun: resetWarningCounts.nextInvocation()
      },
      {
        name: 'resetRegularCounts',
        description: '분기별 정기 참가 횟수(regularCount) 초기화 및 totalCount 이관 (매년 1·4·7·10월 1일 00:00)',
        schedule: '0 0 1 1,4,7,10 *',
        nextRun: resetRegularCounts.nextInvocation()
      },
      {
        name: 'processEventAutoConfirmations',
        description: '이벤트 자동 참가자 확정 (성비 1:1, 어린 순)',
        schedule: '*/5 * * * *',
        nextRun: processEventAutoConfirmations.nextInvocation()
      }
    ],
    currentTime: new Date(),
    timezone: 'Asia/Seoul'
  };
};

module.exports = {
  // 기존 스케줄러들
  resetWarningCounts,
  resetRegularCounts,

  getSchedulerStatus,

  // 이벤트 자동 확정
  processEventAutoConfirmations
};
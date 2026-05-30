// utils/SchedulerService.js - 빙고 보상 처리 추가된 버전

const schedule = require('node-schedule');
const User = require('../models/User');

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

// 격월(1,4,7,10월) 1일 00:00에 regularCount(정기 참여 횟수) 초기화 및 활성상태 업데이트
const resetParticipationCount = schedule.scheduleJob('0 0 1 1,4,7,10 *', async () => {
  try {
    const users = await User.find();
    console.log(`[${new Date()}] participation count update started.`);

    const bulkOperations = users.map((user) => {
      const updateObj = {};

      if ((user.role === 'participant' || user.role === 'starter') && 
          (user.participationCount.regularCount || 0) < 2) {
        updateObj.$set = { 
          role: 'guest',
          active: false 
        };
      }

      if (user.active) {
        updateObj.$inc = {
          'participationCount.totalCount': user.participationCount.regularCount || 0
        };
        updateObj.$set = {
          ...updateObj.$set,
          'participationCount.regularCount': 0
        };
      }

      if (Object.keys(updateObj).length > 0) {
        return {
          updateOne: {
            filter: { _id: user._id },
            update: updateObj
          }
        };
      }
      return null;
    }).filter(Boolean);

    if (bulkOperations.length > 0) {
      await User.bulkWrite(bulkOperations);
      console.log('participation count update completed successfully.');
    } else {
      console.log('No users to update.');
    }
  } catch (error) {
    console.error('Error during bi-monthly participation count update:', error);
  }
});

// ============== 새로 추가: 빙고 보상 처리 스케줄러 ==============

// 매일 자정 00:00에 실행 - 종료된 빙고 활동의 보상 처리
const processBingoRewards = schedule.scheduleJob('0 0 * * *', async () => {
  try {
    console.log(`[${new Date()}] 빙고 보상 처리 스케줄러 시작`);
    
    // 빙고 시스템 모델들을 동적으로 불러오기 (순환 참조 방지)
    const Activity = require('../models/Activity');
    const Team = require('../models/Team');
    
    // 어제 날짜 계산 (활동 종료일)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`어제 종료된 활동 확인: ${yesterday.toISOString().split('T')[0]}`);
    
    // 어제 종료된 활동들 중 보상이 처리되지 않은 것들 조회
    const completedActivities = await Activity.find({
      endDate: {
        $gte: yesterday,
        $lt: today
      },
      rewardProcessed: false,
      isActive: true
    });
    
    console.log(`처리할 빙고 활동 개수: ${completedActivities.length}`);
    
    if (completedActivities.length === 0) {
      console.log('처리할 빙고 활동이 없습니다.');
      return;
    }
    
    let totalRewardedUsers = 0;
    let processedActivities = 0;
    
    for (const activity of completedActivities) {
      try {
        console.log(`빙고 활동 처리 시작: "${activity.title}" (종료일: ${activity.endDate.toISOString().split('T')[0]})`);
        
        // 활동 완료 상태로 변경
        await activity.checkAndCompleteActivity();
        
        // 해당 활동의 모든 팀 조회
        const teams = await Team.find({ activityId: activity._id }).populate('members');
        console.log(`"${activity.title}" 활동의 팀 개수: ${teams.length}`);
        
        const rewardedUsers = [];
        
        for (const team of teams) {
          try {
            // 각 팀의 빙고 개수 계산
            const bingoCount = await team.calculateBingoCount();
            console.log(`${team.name}: ${bingoCount}개 빙고 (목표: ${activity.targetBingos}개)`);
            
            // 목표 빙고 개수 이상 달성한 팀의 모든 멤버에게 보상
            if (bingoCount >= activity.targetBingos) {
              console.log(`${team.name} 보상 대상! 조원 ${team.members.length}명에게 regularCount +2`);
              
              for (const member of team.members) {
                try {
                  // regularCount 증가 (빙고 보상)
                  member.participationCount.regularCount += 2;
                  await member.save();
                  rewardedUsers.push({
                    name: member.name,
                    id: member._id,
                    team: team.name,
                    bingoCount: bingoCount
                  });
                  console.log(`${member.name} (${team.name}): regularCount +2 적용 완료`);
                } catch (memberError) {
                  console.error(`${member.name} 보상 처리 오류:`, memberError);
                }
              }
            } else {
              console.log(`${team.name}: 목표 미달성 (${bingoCount}/${activity.targetBingos}) - 보상 없음`);
            }
          } catch (teamError) {
            console.error(`팀 ${team.name} 처리 중 오류:`, teamError);
          }
        }
        
        // 활동 보상 처리 완료 표시
        activity.rewardProcessed = true;
        activity.isCompleted = true;
        activity.completedAt = new Date();
        await activity.save();
        
        totalRewardedUsers += rewardedUsers.length;
        processedActivities++;
        
        console.log(`"${activity.title}" 보상 처리 완료: ${rewardedUsers.length}명 보상`);
        console.log(`보상받은 사용자: ${rewardedUsers.map(u => `${u.name}(${u.team})`).join(', ')}`);
        
      } catch (activityError) {
        console.error(`빙고 활동 "${activity.title}" 처리 중 오류:`, activityError);
      }
    }
    
    console.log(`[${new Date()}] 빙고 보상 처리 완료:`);
    console.log(`- 처리된 활동: ${processedActivities}개`);
    console.log(`- 총 보상받은 사용자: ${totalRewardedUsers}명`);
    
    if (totalRewardedUsers > 0) {
      console.log(`🎉 빙고 보상 지급 완료! ${totalRewardedUsers}명의 regularCount가 증가했습니다.`);
    }
    
  } catch (error) {
    console.error('빙고 보상 스케줄러 오류:', error);
  }
});

// ============== 수동 빙고 보상 처리 함수들 ==============

// 특정 활동의 보상 수동 처리 (관리자용)
const processActivityRewardsManually = async (activityId) => {
  try {
    console.log(`수동 보상 처리 시작: 활동 ID ${activityId}`);
    
    // 동적 모델 로딩
    const Activity = require('../models/Activity');
    const Team = require('../models/Team');
    
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('활동을 찾을 수 없습니다.');
    }
    
    if (activity.rewardProcessed) {
      throw new Error('이미 보상이 처리된 활동입니다.');
    }
    
    // 활동 완료 처리
    await activity.checkAndCompleteActivity();
    
    // 팀별 보상 처리
    const teams = await Team.find({ activityId: activity._id }).populate('members');
    const rewardedUsers = [];
    
    for (const team of teams) {
      const bingoCount = await team.calculateBingoCount();
      
      if (bingoCount >= activity.targetBingos) {
        for (const member of team.members) {
          member.participationCount.regularCount += 2;
          await member.save();
          rewardedUsers.push(member.name);
        }
      }
    }
    
    // 보상 처리 완료 표시
    activity.rewardProcessed = true;
    activity.isCompleted = true;
    activity.completedAt = new Date();
    await activity.save();
    
    return {
      success: true,
      message: '보상 처리 완료',
      activityTitle: activity.title,
      rewardedUsers,
      totalRewarded: rewardedUsers.length
    };
    
  } catch (error) {
    console.error('수동 보상 처리 오류:', error);
    throw error;
  }
};

// 특정 날짜의 모든 빙고 활동 보상 처리 (관리자용)
const processBingoRewardsByDate = async (targetDate) => {
  try {
    console.log(`날짜별 보상 처리 시작: ${targetDate}`);
    
    // 동적 모델 로딩
    const Activity = require('../models/Activity');
    
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    const activities = await Activity.find({
      endDate: {
        $gte: startDate,
        $lte: endDate
      },
      isActive: true
    });
    
    const results = [];
    
    for (const activity of activities) {
      try {
        const result = await processActivityRewardsManually(activity._id);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          activityId: activity._id,
          activityTitle: activity.title,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      date: targetDate,
      processedActivities: results.length,
      results
    };
    
  } catch (error) {
    console.error('날짜별 보상 처리 오류:', error);
    throw error;
  }
};

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
        name: 'resetParticipationCount',
        description: '정기 참여 횟수 초기화',
        schedule: '0 0 1 1,4,7,10 *',
        nextRun: resetParticipationCount.nextInvocation()
      },
      {
        name: 'processBingoRewards',
        description: '빙고 보상 처리',
        schedule: '0 0 * * *',
        nextRun: processBingoRewards.nextInvocation()
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

// ============== 빙고 시스템 검증 함수 ==============

const validateBingoModels = () => {
  try {
    const Activity = require('../models/Activity');
    const Team = require('../models/Team');
    console.log('빙고 시스템 모델 검증 완료: Activity, Team 모델 정상 로드됨');
    return true;
  } catch (error) {
    console.error('빙고 시스템 모델 검증 실패:', error.message);
    return false;
  }
};

module.exports = {
  // 기존 스케줄러들
  resetWarningCounts,
  resetParticipationCount,

  // 빙고 관련
  processBingoRewards,
  processActivityRewardsManually,
  processBingoRewardsByDate,
  getSchedulerStatus,
  validateBingoModels,

  // 이벤트 자동 확정
  processEventAutoConfirmations
};
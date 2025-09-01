// utils/SchedulerService.js - 업데이트된 버전

const schedule = require('node-schedule');
const User = require('../models/User');

// 1,4,7,10월 1일 00:00에 실행되는 경고 초기화 스케줄러
const resetWarningCounts = schedule.scheduleJob('0 0 1 1,4,7,10 *', async () => {
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

module.exports = {
  resetWarningCounts,
  resetParticipationCount
};
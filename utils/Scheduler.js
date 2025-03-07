const schedule = require('node-schedule');
const User = require('../models/User');

// 1,4,7,10월 1일 00:00에 실행되는 경고 초기화 스케줄러
const resetWarningCounts = schedule.scheduleJob('0 0 1 1,4,7,10 *', async () => {
  try {
    console.log(`[${new Date()}] 경고 횟수 리셋.`);
    
    const result = await User.updateMany(
      {}, // 모든 사용자 대상
      { $set: { warningCount: 0 } }
    );

    console.log(`Warning count reset completed. Modified ${result.modifiedCount} users.`);
  } catch (error) {
    console.error('Error resetting warning counts:', error);
  }
});

// 격월(1,3,5,7,9,11월) 1일 00:00에 regularCount 초기화 및 활성상태 업데이트
const resetParticipationCount = schedule.scheduleJob('0 0 1 1,3,5,7,9,11 *', async () => {
  try {
    const users = await User.find();
    console.log(`[${new Date()}] Bi-monthly participation count update started.`);

    const bulkOperations = users.map((user) => {
      const updateObj = {};

      if (user.role === 'participant' && (user.participationCount.regularCount || 0) < 2) {
        updateObj.$set = { active: false };
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
      console.log('Bi-monthly participation count update completed successfully.');
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

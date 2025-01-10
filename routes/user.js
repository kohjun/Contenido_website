  // routes/user.js
  const express = require('express');
  const router = express.Router();
  const authenticateToken = require('../middleware/authMiddleware');
  const User = require('../models/User'); 
  const schedule = require('node-schedule');

// 1,4,7,10월 1일 00:00에 실행되는 경고 초기화 스케줄러 (3개월)  // '0 */2 * * * *' 2분마다 갱신   // 
schedule.scheduleJob('0 0 1 1,4,7,10 *', async () => {
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
schedule.scheduleJob('0 0 1 1,3,5,7,9,11 *', async () => {
  try {
    const users = await User.find();
    console.log(`[${new Date()}] Bi-monthly participation count update started.`);

    const bulkOperations = users.map((user) => {
      // 기본 업데이트 객체
      const updateObj = {};

      // participant이고 참가횟수가 2회 미만인 경우 활성상태 false로 변경
      if (user.role === 'participant' && (user.participationCount.regularCount || 0) < 2) {
        updateObj.$set = { active: false };
      }

      // 활성상태가 true인 경우에만 참가횟수 초기화 및 누적
      if (user.active) {
        updateObj.$inc = {
          'participationCount.totalCount': user.participationCount.regularCount || 0
        };
        updateObj.$set = {
          ...updateObj.$set,
          'participationCount.regularCount': 0
        };
      }

      // 업데이트할 내용이 있는 경우만 bulkWrite 작업 추가
      if (Object.keys(updateObj).length > 0) {
        return {
          updateOne: {
            filter: { _id: user._id },
            update: updateObj
          }
        };
      }
      return null;
    }).filter(Boolean); // null 제거

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

  // 유저 정보 얻기
  router.get('/info', authenticateToken, (req, res) => {
    console.log('User from JWT:', req.user); 

    if (req.user) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.json({
        id: req.user.id, 
        name: req.user.name,
        nickname: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
        active: req.user.active,
        department: req.user.department,
        team: req.user.team,
        profileImage: req.user.profileImage || '/images/basic_Image.png'
      });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });

  

  


// 참가자 데이터 조회
router.get('/participants/users', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('displayName name participationCount profileImage status active role gender warningCount team department'); // 필요한 필드들을 선택
    
    const userData = users.map(user => ({
      id: user._id,
      displayName: user.displayName,
      name : user.name,
      profileImage: user.profileImage || '/images/basic_Image.png',
      participationCount: user.participationCount,
      active: user.active,
      role: user.role,
      team: user.team,
      department: user.department,
      gender: user.gender || '-',
      warningCount: user.warningCount,
    }));

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});


  // 유저의 역할 검증
  router.get('/user-role', authenticateToken, (req, res) => {
    console.log('Authenticated user role:', req.user?.role);

    if (req.user) {
      res.json({ role: req.user.role });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });
  

  // POST 
  // 유저 활성 상태 토글
  router.post('/toggle-active/:userId', authenticateToken, async (req, res) => {
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
      console.error('Error toggling user active status:', error);
      res.status(500).json({ message: 'Error updating user active status' });
    }
  });
  // 참가 횟수 업데이트
router.post('/update-participation/:userId', authenticateToken, async (req, res) => {
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
    console.error('Error updating participation count:', error);
    res.status(500).json({ message: '참가 횟수 업데이트 중 오류가 발생했습니다.' });
  }
});
  // 경고 횟수 업데이트 - authorizeRoles 미들웨어 추가
router.post('/update-warning/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { warningCount } = req.body;

    // 유효성 검사
    if (typeof warningCount !== 'number' || warningCount < 0) {
      return res.status(400).json({ message: '유효하지 않은 경고 횟수입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 경고 횟수 업데이트
    user.warningCount = warningCount;
    await user.save();

    res.status(200).json({ 
      message: '경고 횟수가 업데이트되었습니다.',
      warningCount: user.warningCount 
    });
  } catch (error) {
    console.error('Error updating warning count:', error);
    res.status(500).json({ message: '경고 횟수 업데이트 중 오류가 발생했습니다.' });
  }
});

//역할 변경 업데이트 
// user.js
router.post('/update-role/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['participant', 'starter', 'officer', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 역할입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const updateFields = { role };

    if (role === 'officer') {
      // officer로 변경 시 부서와 팀 정보 필요
      if (!req.body.department) {
        return res.status(400).json({ message: '운영진의 경우 부서 정보가 필요합니다.' });
      }
      updateFields.department = req.body.department;
      updateFields.team = req.body.team || 'operationTeam';
      updateFields.isDepartmentHead = false;
    } else {
      // officer가 아닌 경우 부서와 팀 정보 제거
      updateFields.$unset = { 
        department: 1, 
        team: 1,
        isDepartmentHead: 1 
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      role === 'officer' ? updateFields : { $set: { role }, $unset: updateFields.$unset },
      { new: true }
    );

    res.status(200).json({
      message: '역할이 성공적으로 변경되었습니다.',
      role: updatedUser.role,
      department: updatedUser.department,
      team: updatedUser.team
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: '역할 변경 중 오류가 발생했습니다.' });
  }
});

// 팀 변경 라우트
router.post('/update-team/:userId', authenticateToken, async (req, res) => {
  try {
      const { userId } = req.params;
      const { team, department } = req.body;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      // officer 역할인지 확인
      if (user.role !== 'officer') {
          return res.status(400).json({ message: '운영진만 팀을 변경할 수 있습니다.' });
      }

      // 팀과 부서 업데이트
      user.team = team;
      user.department = department;
      await user.save();

      res.status(200).json({
          message: '팀이 성공적으로 변경되었습니다.',
          team: user.team,
          department: user.department
      });
  } catch (error) {
      console.error('Error updating user team:', error);
      res.status(500).json({ message: '팀 변경 중 오류가 발생했습니다.' });
  }
});
module.exports = router;
  // routes/user.js
  const express = require('express');
  const router = express.Router();
  const authenticateToken = require('../middleware/authMiddleware');
  const User = require('../models/User'); 
  const schedule = require('node-schedule');

  // 상태 초기화 및 active 업데이트 - 매월 1일 00:00 실행
  schedule.scheduleJob('0 0 1 * *', async () => {  //      */2 * * * *  -> 2분마다 업데이트 , 0 0 1 * *  -> 매월 1일마다 업데이트
    try {
      const users = await User.find();
      console.log(`[${new Date()}] Monthly status update started.`);
  
      const bulkOperations = users.map((user) => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              active: ![user.status.week1, user.status.week2, user.status.week3, user.status.week4].every(week => week !== 'O'),
              status: { week1: 'X', week2: 'X', week3: 'X', week4: 'X' },
            },
          },
        },
      }));
  
      await User.bulkWrite(bulkOperations); // Bulk update for better performance
      console.log('Monthly user status update completed successfully.');
    } catch (error) {
      console.error('Error during monthly user status update:', error);
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
        nickname: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
        active: req.user.active,
        department: req.user.department,
        team: req.user.team,
        isDepartmentHead: req.user.isDepartmentHead,
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
      .select('displayName profileImage status active role gender warningCount team department'); // 필요한 필드들을 선택
    
    const userData = users.map(user => ({
      id: user._id,
      displayName: user.displayName,
      profileImage: user.profileImage || '/images/basic_Image.png',
      status: user.status || { week1: 'X', week2: 'X', week3: 'X', week4: 'X' },
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
router.post('/update-role/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, department, team } = req.body; // department와 team도 받도록 수정

    // 유효한 역할인지 확인
    const validRoles = ['participant', 'starter', 'officer', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 역할입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // officer로 변경하는 경우 필수 정보 확인
    if (role === 'officer') {
      if (!department) {
        return res.status(400).json({ message: '운영진의 경우 부서 정보가 필요합니다.' });
      }
      user.department = department;
      user.team = team || 'operationTeam'; // 기본 팀 설정
      user.isDepartmentHead = false; // 기본값으로 부서장 아님 설정
    }

    // 역할 업데이트
    user.role = role;
    await user.save();

    res.status(200).json({
      message: '역할이 성공적으로 변경되었습니다.',
      role: user.role,
      department: user.department,
      team: user.team
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
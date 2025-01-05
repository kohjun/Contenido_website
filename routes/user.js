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
        active : req.user.active,
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
      .select('displayName profileImage status active role gender warnings'); // 필요한 필드들을 선택
    
    const userData = users.map(user => ({
      id: user._id,
      displayName: user.displayName,
      profileImage: user.profileImage || '/images/basic_Image.png',
      status: user.status || { week1: 'X', week2: 'X', week3: 'X', week4: 'X' },
      active: user.active,
      role: user.role,
      gender: user.gender || '-',
      warnings: user.warnings || 0
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
  
 

  module.exports = router;
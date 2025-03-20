const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const User = require('../models/User');

// 토큰을 사용해서 유저 정보 얻기
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
      isDepartmentHead: req.user.isDepartmentHead,
      profileImage: req.user.profileImage || '/images/basic_Image.png'
    });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// 데이터베이스에서 유저 정보 얻기

router.get('/info_database', authenticateToken, async (req, res) => {
  try {
    // JWT 토큰에서 받은 userId를 사용하여 데이터베이스에서 전체 정보 조회
    const user = await User.findById(req.user.id)
      .select('id name displayName email role active department team profileImage warningCount participationCount phonenumber gender birthDate preferredActivity isDepartmentHead'); // isDepartmentHead 추가
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 캐시 방지 헤더 설정
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // 전체 사용자 정보 반환
    const userInfo = {
      id: user._id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      active: user.active,
      department: user.department,
      team: user.team,
      profileImage: user.profileImage,
      warningCount: user.warningCount,
      participationCount: user.participationCount,
      phonenumber: user.phonenumber,
      gender: user.gender,
      birthDate: user.birthDate,
      preferredActivity: user.preferredActivity,
      isDepartmentHead: user.isDepartmentHead, // 추가
    };

    res.json(userInfo);
  } catch (error) {
    console.error('Error fetching user info from database:', error);
    res.status(500).json({ message: 'Error fetching user info' });
  }
});

//여러 참가자 데이터 조회
router.get('/participants/users', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('displayName name participationCount profileImage status active role gender phonenumber warningCount team department preferredActivity birthDate isTeamLeader'); // isTeamLeader 추가
    
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
      gender: user.gender || '-',
      warningCount: user.warningCount,
      preferredActivity: user.preferredActivity || '-',
      birthDate: user.birthDate,
      isTeamLeader: user.isTeamLeader
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

// 프로필 업데이트 라우트 추가
router.post('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { phonenumber, preferredActivity } = req.body;
    const updateFields = {};

    if (phonenumber !== undefined) {
      if (!/^[0-9]{11}$/.test(phonenumber)) {
        return res.status(400).json({ message: '유효하지 않은 전화번호 형식입니다.' });
      }
      updateFields.phonenumber = phonenumber;
    }

    if (preferredActivity !== undefined) {
      const validDistricts = [
        '강남구', '강동구', '강북구', '강서구', '관악구',
        '광진구', '구로구', '금천구', '노원구', '도봉구',
        '동대문구', '동작구', '마포구', '서대문구', '서초구',
        '성동구', '성북구', '송파구', '양천구', '영등포구',
        '용산구', '은평구', '종로구', '중구', '중랑구'
      ];
      
      if (!validDistricts.includes(preferredActivity)) {
        return res.status(400).json({ message: '유효하지 않은 지역입니다.' });
      }
      updateFields.preferredActivity = preferredActivity;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: {
        phonenumber: user.phonenumber,
        preferredActivity: user.preferredActivity
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: '프로필 업데이트 중 오류가 발생했습니다.' });
  }
});

// 팀장 지정/해제 라우트 수정
router.post('/update-team-leader/:userId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { isTeamLeader } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // officer만 팀장 지정 가능
        if (user.role !== 'officer') {
            return res.status(400).json({ message: '운영진만 팀장으로 지정할 수 있습니다.' });
        }

        user.isTeamLeader = isTeamLeader;
        await user.save();

        res.json({
            success: true,
            message: `팀장 ${isTeamLeader ? '지정' : '해제'}이 완료되었습니다.`
        });
    } catch (error) {
        console.error('팀장 상태 업데이트 중 오류:', error);
        res.status(500).json({ message: '팀장 상태 업데이트에 실패했습니다.' });
    }
});

module.exports = router;
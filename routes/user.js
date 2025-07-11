const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const User = require('../models/User');

// 토큰을 사용해서 유저 정보 얻기
router.get('/info', authenticateToken, (req, res) => {
  if (req.user) {
    // console.log(`사용자 ${req.user.id} 기본 정보 요청`);
    
    // 세션 ID와 현재 사용자 ID 비교
    if (req.session.userId && req.session.userId !== req.user.id.toString()) {
      // console.log(`세션/토큰 불일치: 세션 ID ${req.session.userId}, 토큰 ID ${req.user.id}`);
      // 세션 ID 업데이트
      req.session.userId = req.user.id.toString();
      // console.log(`세션 ID를 ${req.session.userId}로 업데이트`);
    }
    
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
    // console.log('인증되지 않은 사용자의 정보 요청');
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// 데이터베이스에서 유저 정보 얻기
router.get('/info_database', authenticateToken, async (req, res) => {
  try {
    // console.log(`사용자 ${req.user.id} 전체 정보 요청`);
    
    // 세션 ID와 현재 사용자 ID 비교
    if (req.session.userId && req.session.userId !== req.user.id.toString()) {
      // console.log(`세션/토큰 불일치: 세션 ID ${req.session.userId}, 토큰 ID ${req.user.id}`);
      // 세션 ID 업데이트
      req.session.userId = req.user.id.toString();
      // console.log(`세션 ID를 ${req.session.userId}로 업데이트`);
    }
    
    // JWT 토큰에서 받은 userId를 사용하여 데이터베이스에서 전체 정보 조회
    const user = await User.findById(req.user.id)
      .select('id name displayName email role active department team profileImage warningCount participationCount phonenumber gender birthDate preferredActivity isDepartmentHead createdAt');
    
    if (!user) {
      console.log(`사용자 ${req.user.id}를 데이터베이스에서 찾을 수 없음`);
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
      createdAt: user.createdAt,
    };

    console.log(`사용자 ${req.user.id} 정보 반환 성공`);
    res.json(userInfo);
  } catch (error) {
    console.error(`사용자 정보 조회 중 오류 발생:`, error);
    res.status(500).json({ message: 'Error fetching user info' });
  }
});

//여러 참가자 데이터 조회
router.get('/participants/users', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('displayName name participationCount profileImage status active role gender phonenumber warningCount team department preferredActivity birthDate isTeamLeader createdAt staffSubteam'); // staffSubteam 추가
    
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
      isTeamLeader: user.isTeamLeader,
      createdAt: user.createdAt,  // createdAt 추가
      staffSubteam: user.staffSubteam // staffSubteam 추가
    }));

    // console.log(`${userData.length}명의 사용자 정보 반환`);
    res.status(200).json(userData);
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// 유저의 역할 검증
router.get('/user-role', authenticateToken, (req, res) => {
  // console.log(`사용자 ${req.user?.id} 역할 요청: ${req.user?.role || 'guest'}`);

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

    // active 값이 boolean인지 체크
    if (typeof active !== 'boolean') {
      console.error(`잘못된 active 값: ${active} (type: ${typeof active})`);
      return res.status(400).json({ message: 'active 값은 true 또는 false여야 합니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error(`사용자 ${userId}를 찾을 수 없음`);
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = active;
    await user.save();

    res.status(200).json({ message: 'User active status updated successfully' });
  } catch (error) {
    console.error(`활성화 상태 변경 중 오류:`, error);
    res.status(500).json({ message: 'Error updating user active status', error: error.message });
  }
});

// 참가 횟수 업데이트
router.post('/update-participation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { regularCount } = req.body;

    // console.log(`사용자 ${userId} 참가 횟수 업데이트 요청: ${regularCount}`);

    // 유효성 검사
    if (typeof regularCount !== 'number' || regularCount < 0) {
      // console.log(`유효하지 않은 참가 횟수: ${regularCount}`);
      return res.status(400).json({ message: '유효하지 않은 참가 횟수입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`사용자 ${userId}를 찾을 수 없음`);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 참가 횟수 업데이트
    user.participationCount.regularCount = regularCount;
    await user.save();

    // console.log(`사용자 ${userId} 참가 횟수 업데이트 완료: ${regularCount}`);
    res.status(200).json({ 
      message: '참가 횟수가 업데이트되었습니다.',
      regularCount: user.participationCount.regularCount 
    });
  } catch (error) {
    console.error(`참가 횟수 업데이트 중 오류:`, error);
    res.status(500).json({ message: '참가 횟수 업데이트 중 오류가 발생했습니다.' });
  }
});

// 경고 횟수 업데이트 - authorizeRoles 미들웨어 추가
router.post('/update-warning/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { warningCount } = req.body;

    // console.log(`사용자 ${userId} 경고 횟수 업데이트 요청: ${warningCount}`);

    // 유효성 검사
    if (typeof warningCount !== 'number' || warningCount < 0) {
      // console.log(`유효하지 않은 경고 횟수: ${warningCount}`);
      return res.status(400).json({ message: '유효하지 않은 경고 횟수입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`사용자 ${userId}를 찾을 수 없음`);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 경고 횟수 업데이트
    user.warningCount = warningCount;
    await user.save();

    // console.log(`사용자 ${userId} 경고 횟수 업데이트 완료: ${warningCount}`);
    res.status(200).json({ 
      message: '경고 횟수가 업데이트되었습니다.',
      warningCount: user.warningCount 
    });
  } catch (error) {
    console.error(`경고 횟수 업데이트 중 오류:`, error);
    res.status(500).json({ message: '경고 횟수 업데이트 중 오류가 발생했습니다.' });
  }
});

//역할 변경 업데이트 
// user.js
router.post('/update-role/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // console.log(`사용자 ${userId} 역할 변경 요청: ${role}`);

    const validRoles = ['participant', 'starter', 'officer', 'guest'];
    if (!validRoles.includes(role)) {
      console.log(`유효하지 않은 역할: ${role}`);
      return res.status(400).json({ message: '유효하지 않은 역할입니다.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`사용자 ${userId}를 찾을 수 없음`);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const updateFields = { role };

    if (role === 'officer') {
      // officer로 변경 시 부서와 팀 정보 필요
      if (!req.body.department) {
        console.log('운영진 변경 시 부서 정보 누락');
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

    // console.log(`사용자 ${userId} 역할 변경 완료: ${updatedUser.role}`);
    res.status(200).json({
      message: '역할이 성공적으로 변경되었습니다.',
      role: updatedUser.role,
      department: updatedUser.department,
      team: updatedUser.team
    });
  } catch (error) {
    console.error(`역할 변경 중 오류:`, error);
    res.status(500).json({ message: '역할 변경 중 오류가 발생했습니다.' });
  }
});

// 팀 변경 라우트 (팀/부서만 변경, staffTeam이면 staffSubteam도 포함)
router.post('/update-team/:userId', authenticateToken, async (req, res) => {
  try {
      const { userId } = req.params;
      const { team, department, staffSubteam } = req.body;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      if (user.role !== 'officer') {
          return res.status(400).json({ message: '운영진만 팀을 변경할 수 있습니다.' });
      }

      user.team = team;
      user.department = department;
      if (team === 'staffTeam') {
        user.staffSubteam = staffSubteam || null;
      } else {
        user.staffSubteam = undefined;
      }
      await user.save();

      res.status(200).json({
          message: '팀이 성공적으로 변경되었습니다.',
          team: user.team,
          department: user.department,
          staffSubteam: user.staffSubteam
      });
  } catch (error) {
      console.error(`팀 변경 중 오류:`, error);
      res.status(500).json({ message: '팀 변경 중 오류가 발생했습니다.' });
  }
});

// 스태프 소그룹만 단독 변경 라우트
router.post('/update-staffsubteam/:userId', authenticateToken, async (req, res) => {
  try {
      const { userId } = req.params;
      const { staffSubteam } = req.body;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }
      if (user.role !== 'officer' || user.team !== 'staffTeam') {
          return res.status(400).json({ message: '스태프팀 소속 운영진만 소그룹을 변경할 수 있습니다.' });
      }
      if (!staffSubteam) {
          return res.status(400).json({ message: '스태프 소그룹 값이 필요합니다.' });
      }

      user.staffSubteam = staffSubteam;
      await user.save();

      res.status(200).json({
          message: '스태프 소그룹이 성공적으로 변경되었습니다.',
          staffSubteam: user.staffSubteam
      });
  } catch (error) {
      console.error(`스태프 소그룹 변경 중 오류:`, error);
      res.status(500).json({ message: '스태프 소그룹 변경 중 오류가 발생했습니다.' });
  }
});

// 프로필 업데이트 라우트 추가
router.post('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { phonenumber, preferredActivity } = req.body;
    const updateFields = {};

    // console.log(`사용자 ${req.user.id} 프로필 업데이트 요청`);

    if (phonenumber !== undefined) {
      if (!/^[0-9]{11}$/.test(phonenumber)) {
        console.log(`유효하지 않은 전화번호 형식: ${phonenumber}`);
        return res.status(400).json({ message: '유효하지 않은 전화번호 형식입니다.' });
      }
      updateFields.phonenumber = phonenumber;
      // console.log(`전화번호 업데이트: ${phonenumber}`);
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
        console.log(`유효하지 않은 지역: ${preferredActivity}`);
        return res.status(400).json({ message: '유효하지 않은 지역입니다.' });
      }
      updateFields.preferredActivity = preferredActivity;
      console.log(`선호 지역 업데이트: ${preferredActivity}`);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      console.log(`사용자 ${req.user.id}를 찾을 수 없음`);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // console.log(`사용자 ${req.user.id} 프로필 업데이트 완료`);
    res.json({
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: {
        phonenumber: user.phonenumber,
        preferredActivity: user.preferredActivity
      }
    });
  } catch (error) {
    console.error(`프로필 업데이트 중 오류:`, error);
    res.status(500).json({ message: '프로필 업데이트 중 오류가 발생했습니다.' });
  }
});

// 팀장 지정/해제 라우트 수정
router.post('/update-team-leader/:userId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { isTeamLeader } = req.body;

        // console.log(`사용자 ${userId} 팀장 상태 변경 요청: ${isTeamLeader}`);

        const user = await User.findById(userId);
        if (!user) {
            console.log(`사용자 ${userId}를 찾을 수 없음`);
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // officer만 팀장 지정 가능
        if (user.role !== 'officer') {
            console.log(`사용자 ${userId}는 운영진이 아님`);
            return res.status(400).json({ message: '운영진만 팀장으로 지정할 수 있습니다.' });
        }

        user.isTeamLeader = isTeamLeader;
        await user.save();

        // console.log(`사용자 ${userId} 팀장 상태 변경 완료: ${isTeamLeader}`);
        res.json({
            success: true,
            message: `팀장 ${isTeamLeader ? '지정' : '해제'}이 완료되었습니다.`
        });
    } catch (error) {
        console.error(`팀장 상태 업데이트 중 오류:`, error);
        res.status(500).json({ message: '팀장 상태 업데이트에 실패했습니다.' });
    }
});

module.exports = router;
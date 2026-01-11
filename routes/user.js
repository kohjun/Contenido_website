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
    
    // 세션 ID와 현재 사용자 ID 비교
    if (req.session.userId && req.session.userId !== req.user.id.toString()) {
      // console.log(`세션/토큰 불일치: 세션 ID ${req.session.userId}, 토큰 ID ${req.user.id}`);
      // 세션 ID 업데이트
      req.session.userId = req.user.id.toString();
      // console.log(`세션 ID를 ${req.session.userId}로 업데이트`);
    }
    
    // JWT 토큰에서 받은 userId를 사용하여 데이터베이스에서 전체 정보 조회
    const user = await User.findById(req.user.id)
      .select('id name displayName email role active department team profileImage warningCount participationCount phonenumber gender birthDate preferredActivity university isDepartmentHead createdAt');
    
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
      university: user.university,
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
      .select('displayName name participationCount profileImage status active role gender phonenumber warningCount team department preferredActivity birthDate isTeamLeader university createdAt staffSubteam workMemo');
    
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
      university: user.university,
      gender: user.gender || '-',
      warningCount: user.warningCount,
      preferredActivity: user.preferredActivity || '-',
      birthDate: user.birthDate,
      isTeamLeader: user.isTeamLeader,
      createdAt: user.createdAt,  // createdAt 추가
      staffSubteam: user.staffSubteam, // staffSubteam 추가
      workMemo: user.workMemo || ''
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

// 경고 내역 조회
router.get('/warning-history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .populate('warningHistory.issuedBy', 'name')
      .select('name warningCount warningHistory lastWarningResetDate');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 활성 경고만 필터링하거나 전체 내역 조회 옵션
    const showAll = req.query.showAll === 'true';
    const warningHistory = showAll 
      ? user.warningHistory 
      : user.warningHistory.filter(warning => warning.isActive);

    res.status(200).json({
      userName: user.name,
      currentWarningCount: user.warningCount,
      lastResetDate: user.lastWarningResetDate,
      warningHistory: warningHistory.map(warning => ({
        id: warning._id,
        reason: warning.reason,
        issuedByName: warning.issuedByName,
        issuedAt: warning.issuedAt,
        category: warning.category,
        isActive: warning.isActive
      }))
    });
  } catch (error) {
    console.error('경고 내역 조회 중 오류:', error);
    res.status(500).json({ message: '경고 내역 조회 중 오류가 발생했습니다.' });
  }
});

// ============== 빙고 시스템용 API 추가 ==============

// 기존 /participants/users 엔드포인트를 빙고 시스템에 맞게 수정 또는 새로 추가
router.get('/participants/bingo', 
  authenticateToken, 
  authorizeRoles('admin', 'officer'), 
  async (req, res) => {
    try {
      // 활성 사용자 중 participant, starter, officer만 조회
      const users = await User.find({
        active: true,
        role: { $in: ['participant', 'starter', 'officer'] }
      }).select('name role birthDate gender department team');
      
      // 빙고 시스템에 맞는 형태로 데이터 가공
      const userData = users.map(user => {
        // 나이 계산 (한국식 나이)
        const age = user.birthDate ? 
          new Date().getFullYear() - new Date(user.birthDate).getFullYear() + 1 : null;
        
        // 역할 한글 변환
        const roleMap = {
          'participant': '일반회원',
          'starter': '스타터',
          'officer': '운영진'
        };
        
        // 성별 한글 변환
        const genderMap = {
          'male': '남성',
          'female': '여성',
          'other': '기타'
        };
        
        return {
          id: user._id,
          name: user.name || '이름 없음',
          role: roleMap[user.role] || user.role,
          age: age,
          gender: genderMap[user.gender] || '미설정',
          department: user.department || '',
          team: user.team || ''
        };
      });
      
      res.json({
        success: true,
        count: userData.length,
        data: userData
      });
      
    } catch (error) {
      console.error('빙고 시스템 사용자 정보 조회 에러:', error);
      res.status(500).json({ 
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message 
      });
    }
  }
);

// POST 
// 유저 활성 상태 토글
router.post('/toggle-active/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    // console.log(`사용자 ${userId} 활성화 상태 변경 요청: ${active}`);

    const user = await User.findById(userId);
    if (!user) {
      console.log(`사용자 ${userId}를 찾을 수 없음`);
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = active;
    await user.save();

    // console.log(`사용자 ${userId} 활성화 상태 변경 완료: ${active}`);
    res.status(200).json({ message: 'User active status updated successfully' });
  } catch (error) {
    console.error(`활성화 상태 변경 중 오류:`, error);
    res.status(500).json({ message: 'Error updating user active status' });
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

// 경고 부여 - authorizeRoles 미들웨어 추가
router.post('/issue-warning/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, category = '기타' } = req.body;
    const issuedBy = req.user.id;
    const issuedByName = req.user.name;

    // 유효성 검사
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: '경고 사유를 입력해주세요.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 새로운 경고 내역 생성
    const newWarning = {
      reason: reason.trim(),
      issuedBy,
      issuedByName,
      category,
      issuedAt: new Date()
    };

    // 경고 내역 추가 및 경고 횟수 증가
    user.warningHistory.push(newWarning);
    user.warningCount += 1;
    await user.save();

    console.log(`경고 부여 완료: ${user.name}(${userId}) - 사유: ${reason} - 부여자: ${issuedByName}`);

    res.status(200).json({
      message: '경고가 부여되었습니다.',
      warningCount: user.warningCount,
      newWarning: {
        reason: newWarning.reason,
        issuedByName: newWarning.issuedByName,
        issuedAt: newWarning.issuedAt,
        category: newWarning.category
      }
    });
  } catch (error) {
    console.error('경고 부여 중 오류:', error);
    res.status(500).json({ message: '경고 부여 중 오류가 발생했습니다.' });
  }
});


// 특정 경고 삭제/비활성화
router.post('/remove-warning/:userId/:warningId', authenticateToken, async (req, res) => {
  try {
    const { userId, warningId } = req.params;
    const { reason = '관리자 판단' } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const warning = user.warningHistory.id(warningId);
    if (!warning) {
      return res.status(404).json({ message: '해당 경고를 찾을 수 없습니다.' });
    }

    if (!warning.isActive) {
      return res.status(400).json({ message: '이미 비활성화된 경고입니다.' });
    }

    // 경고 비활성화 및 경고 횟수 감소
    warning.isActive = false;
    user.warningCount = Math.max(0, user.warningCount - 1);
    
    await user.save();

    console.log(`경고 삭제: ${user.name}(${userId}) - 삭제된 경고: ${warning.reason} - 삭제 사유: ${reason}`);

    res.status(200).json({
      message: '경고가 삭제되었습니다.',
      warningCount: user.warningCount
    });
  } catch (error) {
    console.error('경고 삭제 중 오류:', error);
    res.status(500).json({ message: '경고 삭제 중 오류가 발생했습니다.' });
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

// 팀 변경 라우트
router.post('/update-team/:userId', authenticateToken, async (req, res) => {
  try {
      const { userId } = req.params;
      const { team, department } = req.body;

      // console.log(`사용자 ${userId} 팀 변경 요청: 부서=${department}, 팀=${team}`);

      const user = await User.findById(userId);
      if (!user) {
          console.log(`사용자 ${userId}를 찾을 수 없음`);
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      // officer 역할인지 확인
      if (user.role !== 'officer') {
          console.log(`사용자 ${userId}는 운영진이 아님`);
          return res.status(400).json({ message: '운영진만 팀을 변경할 수 있습니다.' });
      }

      // 팀과 부서 업데이트
      user.team = team;
      user.department = department;
      await user.save();

      // console.log(`사용자 ${userId} 팀 변경 완료: 부서=${user.department}, 팀=${user.team}`);
      res.status(200).json({
          message: '팀이 성공적으로 변경되었습니다.',
          team: user.team,
          department: user.department
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

// 운영진 업무 메모 수정 - authenticateToken 추가
router.patch('/officers/:userId/work-memo', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { workMemo } = req.body;
    
    // ============ 수정: req.user 사용 (session 대신) ============
    const currentUserId = req.user.id;  // req.user는 authenticateToken에서 설정됨
    
    // 권한 확인: 운영진 또는 관리자만 수정 가능
    const currentUser = await User.findById(currentUserId);
    if (!currentUser || !['officer', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '운영진만 업무 메모를 수정할 수 있습니다.' 
      });
    }
    
    // 대상 유저가 운영진인지 확인
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }
    
    // ============ 수정: officer가 아니어도 메모 저장 가능하도록 ============
    // (조직도에서 officer만 표시되므로 실제로는 officer만 들어옴)
    if (targetUser.role !== 'officer') {
      return res.status(400).json({ 
        success: false, 
        message: '운영진만 업무 메모를 설정할 수 있습니다.' 
      });
    }
    
    // 메모 길이 검증
    if (workMemo && workMemo.length > 500) {
      return res.status(400).json({ 
        success: false, 
        message: '메모는 500자를 초과할 수 없습니다.' 
      });
    }
    
    // 업무 메모 업데이트
    targetUser.workMemo = workMemo || '';
    
    // ============ 추가: validation 문제 방지 ============
    // officer가 아닌데 workMemo가 설정되는 것 방지
    if (targetUser.role !== 'officer') {
      targetUser.workMemo = undefined;
    }
    
    await targetUser.save();
    
    res.json({ 
      success: true, 
      message: '업무 메모가 저장되었습니다.',
      data: {
        workMemo: targetUser.workMemo
      }
    });
    
  } catch (error) {
    console.error('업무 메모 수정 오류:', error);
    console.error('Error stack:', error.stack);
    
    // Validation 에러 상세 정보
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});


module.exports = router;

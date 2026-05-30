// routes/user/profile.js
// 프로필/개인정보 조회·수정 + 역할 검증 + 업무 메모
// (이전: routes/user.js)

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const User = require('../../models/User');

// 토큰을 사용해서 유저 정보 얻기
router.get('/info', authenticateToken, (req, res) => {
  if (req.user) {

    // 세션 ID와 현재 사용자 ID 비교
    if (req.session.userId && req.session.userId !== req.user.id.toString()) {
      // 세션 ID 업데이트
      req.session.userId = req.user.id.toString();
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
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// 데이터베이스에서 유저 정보 얻기
router.get('/info_database', authenticateToken, async (req, res) => {
  try {

    // 세션 ID와 현재 사용자 ID 비교
    if (req.session.userId && req.session.userId !== req.user.id.toString()) {
      // 세션 ID 업데이트
      req.session.userId = req.user.id.toString();
    }

    // JWT 토큰에서 받은 userId를 사용하여 데이터베이스에서 전체 정보 조회
    const user = await User.findById(req.user.id)
      .select('id name displayName email role active department team profileImage warningCount participationCount phonenumber gender birthDate preferredActivity university isDepartmentHead createdAt');

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
      university: user.university,
      preferredActivity: user.preferredActivity,
      isDepartmentHead: user.isDepartmentHead, // 추가
      createdAt: user.createdAt,
    };

    res.json(userInfo);
  } catch (error) {
    console.error(`사용자 정보 조회 중 오류 발생:`, error);
    res.status(500).json({ message: 'Error fetching user info' });
  }
});

// 유저의 역할 검증
router.get('/user-role', authenticateToken, (req, res) => {

  if (req.user) {
    res.json({ role: req.user.role });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
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
    console.error(`프로필 업데이트 중 오류:`, error);
    res.status(500).json({ message: '프로필 업데이트 중 오류가 발생했습니다.' });
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

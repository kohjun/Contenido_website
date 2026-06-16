const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const Certificate = require('../../models/Certificate');

// POST /user/certificate/issue
router.post('/certificate/issue', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 1. 활성 부원 여부 체크 (active === true)
    if (!user.active) {
      return res.status(400).json({ 
        success: false, 
        message: '비활성 상태의 부원은 활동증명서를 발급받을 수 없습니다.' 
      });
    }

    // 2. 가입일 기준 활동 기간 계산
    const now = new Date();
    const joinDate = user.createdAt || now;
    
    let monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    if (now.getDate() < joinDate.getDate()) {
      monthsDiff--;
    }

    // 3. 권한별 자격 요건 체크
    // 운영진(officer) 및 관리자(admin)는 6개월, 그 외(starter, participant 등)는 12개월(1년)
    const isOfficerOrAdmin = ['officer', 'admin'].includes(user.role);
    const requiredMonths = isOfficerOrAdmin ? 6 : 12;

    if (monthsDiff < requiredMonths) {
      const roleText = isOfficerOrAdmin ? '운영진/관리자' : '일반부원/스타터';
      const termText = isOfficerOrAdmin ? '6개월' : '1년';
      return res.status(400).json({ 
        success: false, 
        message: `활동 기간이 부족합니다. ${roleText}은 가입일 기준 최소 ${termText} 이상 활동해야 발급이 가능합니다. (현재: ${monthsDiff}개월 활동 중)`
      });
    }

    // 4. 기존 발급 내역이 있는지 조회
    let certificate = await Certificate.findOne({ user: user._id });

    if (!certificate) {
      // 5. 새로 발급 처리 (일련번호 생성)
      // 전체 발급된 문서 수 기준으로 순번 결정
      const count = await Certificate.countDocuments();
      const seqStr = String(count + 1).padStart(6, '0');
      const year = now.getFullYear();

      // 역할별 약어 결정: officer -> OP, admin -> AD, starter -> ST, participant -> PA, 기본 -> PA
      let roleAbbr = 'PA';
      if (user.role === 'officer') roleAbbr = 'OP';
      else if (user.role === 'admin') roleAbbr = 'AD';
      else if (user.role === 'starter') roleAbbr = 'ST';

      const serialNumber = `CND-${year}-${roleAbbr}-${seqStr}`;

      certificate = new Certificate({
        user: user._id,
        serialNumber,
        issuedAt: now
      });

      await certificate.save();
    }

    // 6. 결과 반환 (활동증명서 기입에 필요한 모든 정보 포함)
    res.json({
      success: true,
      data: {
        serialNumber: certificate.serialNumber,
        name: user.name,
        role: user.role,
        department: user.department,
        team: user.team,
        isDepartmentHead: user.isDepartmentHead,
        isTeamLeader: user.isTeamLeader,
        joinDate: user.createdAt,
        issueDate: certificate.issuedAt
      }
    });

  } catch (error) {
    console.error('활동증명서 발급 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;

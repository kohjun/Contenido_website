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

    // 1. 가입일 기준 활동 기간 계산
    const now = new Date();
    const joinDate = user.createdAt || now;
    
    let monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    if (now.getDate() < joinDate.getDate()) {
      monthsDiff--;
    }

    // 2. 권한별 자격 요건 체크
    // 운영진(officer) 및 관리자(admin)는 6개월, 그 외(starter, participant 등)는 12개월(1년)
    const isOfficerOrAdmin = ['officer', 'admin'].includes(user.role);
    const requiredMonths = isOfficerOrAdmin ? 6 : 12;

    // 현재 발급 자격이 충족되는지 여부
    const isCurrentlyEligible = user.active && (monthsDiff >= requiredMonths);

    // 3. 기존 발급 내역이 있는지 조회
    let certificate = await Certificate.findOne({ user: user._id });

    if (!isCurrentlyEligible) {
      // 발급 조건에 부합하지 않더라도, 이미 이전에 발급한 내역이 있다면 기존 내역(기존 날짜 및 일련번호)을 반환
      if (certificate) {
        return res.json({
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
      } else {
        // 이전에 발급한 적도 없고 현재 자격 조건에도 미달하는 경우 에러 반환
        const roleText = isOfficerOrAdmin ? '운영진/관리자' : '일반부원/스타터';
        const termText = isOfficerOrAdmin ? '6개월' : '1년';
        const failReason = !user.active 
          ? '비활성 상태의 부원은 활동증명서를 발급받을 수 없습니다.'
          : `활동 기간이 부족합니다. ${roleText}은 가입일 기준 최소 ${termText} 이상 활동해야 발급이 가능합니다. (현재: ${monthsDiff}개월 활동 중)`;
        return res.status(400).json({ 
          success: false, 
          message: failReason 
        });
      }
    }

    // 4. 자격 조건에 충족하는 경우 (신규 발급 또는 갱신 발급)
    if (!certificate) {
      // 새로 발급 처리 (일련번호 생성)
      const count = await Certificate.countDocuments();
      const seqStr = String(count + 1).padStart(6, '0');
      const year = now.getFullYear();

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
    } else {
      // 기존 발급 내역이 있다면 발급일(issuedAt)을 현재 갱신 시점 날짜로 업데이트 후 저장
      certificate.issuedAt = now;
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

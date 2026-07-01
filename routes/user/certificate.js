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
    // 운영진은 6개월 경과 & 6회 참여, 그 외는 12개월 경과 & 12회 참여
    const isOfficerOrAdmin = ['officer', 'admin'].includes(user.role);
    const requiredMonths = isOfficerOrAdmin ? 6 : 12;
    const requiredParticipations = isOfficerOrAdmin ? 6 : 12;
    
    const totalCount = (user.participationCount && user.participationCount.totalCount) || 0;
    const regularCount = (user.participationCount && user.participationCount.regularCount) || 0;
    const userTotalCount = totalCount + regularCount;

    // 현재 발급 자격이 충족되는지 여부 (활성상태 + 가입기간 + 총참여횟수 모두 충족)
    const isCurrentlyEligible = user.active && 
                                (monthsDiff >= requiredMonths) && 
                                (userTotalCount >= requiredParticipations);

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
        const roleText = isOfficerOrAdmin ? '운영진' : '일반부원(참가자)';
        const termText = isOfficerOrAdmin ? '6개월' : '1년';
        
        let failReason = '';
        if (!user.active) {
          failReason = '비활성 상태의 부원은 활동증명서를 발급받을 수 없습니다.';
        } else if (monthsDiff < requiredMonths) {
          failReason = `활동 기간이 부족합니다. ${roleText}은 가입일 기준 최소 ${termText} 이상 활동해야 발급이 가능합니다. (현재 가입 후: ${monthsDiff}개월 경과)`;
        } else if (userTotalCount < requiredParticipations) {
          failReason = `이벤트 참여 횟수가 부족합니다. ${roleText}은 최소 ${requiredParticipations}회 이상 이벤트에 참여해야 발급이 가능합니다. (현재 총 참여: ${userTotalCount}회)`;
        } else {
          failReason = '활동증명서 발급 요건을 충족하지 못했습니다.';
        }

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

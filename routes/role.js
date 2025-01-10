const express = require('express');
const path = require('path');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// 모든 office 페이지에 대한 기본 보안 미들웨어
router.use('/office*.html', authenticateToken, authorizeRoles('officer','admin'));

// 운영진 메인 페이지
router.get(['/office.html', '/office'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/office.html'));
});

// office로 시작하는 모든 페이지에 대한 접근 제어
router.get('/office_:team.html', async (req, res, next) => {
  try {
    const teamId = req.params.team;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // 부서별 팀 매핑 정의
    const departmentTeams = {
      operation: ['operationTeam', 'cooperationTeam', 'HumanResourceTeam', 'financeTeam'],
      promotion: ['marketingTeam', 'designTeam', 'videoTeam'],
      planning: ['PlanningTeam', 'regularTeam', 'staffTeam']
    };

    // 권한이 확인되면 해당 페이지 전송
    res.sendFile(path.join(__dirname, `../public/office_${teamId}.html`));
  } catch (error) {
    console.error('Error in team page access:', error);
    next(error);
  }
});

// 권한 없는 접근 시도에 대한 처리
router.use('/office*.html', (req, res) => {
  res.status(403).json({ message: '접근이 거부되었습니다.' });
});

module.exports = router;
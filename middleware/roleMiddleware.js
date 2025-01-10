// middleware/roleMiddleware.js
const Event = require('../models/Event');

// 부서별 팀 매핑 정보
const departmentTeams = {
    operation: ['operationTeam', 'cooperationTeam', 'HumanResourceTeam', 'financeTeam'],
    promotion: ['marketingTeam', 'designTeam', 'videoTeam'],
    planning: ['PlanningTeam', 'regularTeam', 'staffTeam']
};

// URL 경로에서 팀 ID를 추출하는 함수
const extractTeamFromUrl = (url) => {
    // /office_hr.html 형식의 URL에서 팀 ID 추출
    const match = url.match(/\/office_([^.]+)\.html/);
    if (match) {
        // 팀 ID와 실제 팀 매핑
        const urlTeamMap = {
            'hr': 'HumanResourceTeam',
            'operation': 'operationTeam',
            'cooperation': 'cooperationTeam',
            'finance': 'financeTeam',
            'marketing': 'marketingTeam',
            'design': 'designTeam',
            'video': 'videoTeam',
            'planning': 'PlanningTeam',
            'regular': 'regularTeam',
            'staff': 'staffTeam'
        };
        return urlTeamMap[match[1]];
    }
    return null;
};

// 사용자가 특정 팀에 접근할 권한이 있는지 확인하는 함수
const hasTeamAccess = (user, teamId) => {
    // 부장인 경우
    if (user.isDepartmentHead) {
        return departmentTeams[user.department]?.includes(teamId);
    }
    // 일반 팀원인 경우
    return user.team === teamId;
};

const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        // 1. 기본 인증 확인
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // 2. 역할 확인
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'You do not have permission to perform this action' 
            });
        }

        // 3. Officer 특별 권한 확인
        if (req.user.role === 'officer') {
            const eventId = req.params.id || req.body.eventId;
            const teamId = extractTeamFromUrl(req.originalUrl);

            // 이벤트 관련 접근 체크
            if (eventId) {
                try {
                    const event = await Event.findById(eventId);
                    if (event && event.creator.toString() !== req.user.id) {
                        return res.status(403).json({ 
                            message: 'Only event creator can access this' 
                        });
                    }
                } catch (error) {
                    return res.status(500).json({ 
                        message: 'Error checking event authorization' 
                    });
                }
            }
            // 팀 페이지 접근 체크
            else{
                if(req.user.role==='admin'){}
                else if (teamId) {
                    if (!hasTeamAccess(req.user, teamId)) {
                        return res.status(403).json({ 
                            message: 'You do not have permission to access this team page' 
                        });
                    }
                }
            }
        }

        next();
    };
};

const requireActiveUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
  
    if (!req.user.active) {
        return res.status(403).json({ 
            message: 'Your account must be active to perform this action' 
        });
    }
  
    next();
};

module.exports = {
    authorizeRoles,
    requireActiveUser,
};
// routes/user/_constants.js
// user sub-router들이 공유하는 상수

// 팀 → 부서 매핑 (update-role / update-team 양쪽에서 사용)
const TEAM_TO_DEPARTMENT = {
  operationTeam:     'operation',
  cooperationTeam:   'operation',
  HumanResourceTeam: 'operation',
  marketingTeam:     'promotion',
  designTeam:        'promotion',
  videoTeam:         'promotion',
  PlanningTeam:      'planning',
  regularTeam:       'planning',
  staffTeam:         'planning',
  projectTeam:       'planning'
};

module.exports = { TEAM_TO_DEPARTMENT };

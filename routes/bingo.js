// routes/bingo.js
const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Team = require('../models/Team');
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ============== 활동 관리 API ==============

// 특정 활동 조회 (개별 활동 선택용)
router.get('/activities/:id', 
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id)
        .populate('participants', 'name role department team')
        .populate('createdBy', 'name');
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      res.json(activity);
    } catch (error) {
      console.error('활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 미션 설정 저장
router.put('/activities/:id/missions',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { bingoMissions } = req.body;
      const activity = await Activity.findById(req.params.id);
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      activity.bingoMissions = bingoMissions;
      await activity.save();
      
      res.json({ message: '미션 설정이 저장되었습니다.' });
    } catch (error) {
      console.error('미션 저장 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);
// 모든 활동 조회 (관리자)
router.get('/activities', 
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activities = await Activity.find()
        .populate('participants', 'name role department team')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
      
      res.json(activities);
    } catch (error) {
      console.error('활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동 생성 (관리자)
router.post('/activities',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { title, startDate, endDate, description, targetBingos, bingoMissions } = req.body;
      
      // 유효성 검사
      if (!title || !startDate || !endDate) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
      }
      
      const activity = new Activity({
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        targetBingos: targetBingos || 2,
        bingoMissions: bingoMissions || [],
        createdBy: req.user.id
      });
      
      await activity.save();
      res.status(201).json(activity);
    } catch (error) {
      console.error('활동 생성 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동 수정 (관리자)
router.put('/activities/:id',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      Object.assign(activity, req.body);
      await activity.save();
      
      res.json(activity);
    } catch (error) {
      console.error('활동 수정 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 활동에 참가자 추가/제거 (관리자)
router.post('/activities/:id/participants',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { userIds, action } = req.body; // action: 'add' or 'remove'
      const activity = await Activity.findById(req.params.id);
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      if (action === 'add') {
        userIds.forEach(userId => {
          if (!activity.participants.includes(userId)) {
            activity.participants.push(userId);
          }
        });
      } else if (action === 'remove') {
        activity.participants = activity.participants.filter(
          id => !userIds.includes(id.toString())
        );
      }
      
      await activity.save();
      await activity.populate('participants', 'name role department team');
      
      res.json(activity);
    } catch (error) {
      console.error('참가자 관리 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// ============== 조 관리 API ==============
// 특정 팀 상세 정보 조회
router.get('/teams/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const team = await Team.findById(req.params.id)
        .populate('members', 'name role department team')
        .populate('leaderId', 'name')
        .populate('activityId');
      
      if (!team) {
        return res.status(404).json({ message: '팀을 찾을 수 없습니다.' });
      }
      
      // 빙고 카운트 계산
      await team.calculateBingoCount();
      
      // summary 정보 추가
      const summary = await team.getSummary();
      
      res.json({
        ...team.toObject(),
        summary
      });
    } catch (error) {
      console.error('팀 상세 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);
// 활동의 조 목록 조회
router.get('/activities/:id/teams',
  authenticateToken,
  async (req, res) => {
    try {
      const teams = await Team.find({ activityId: req.params.id })
        .populate('members', 'name gender birthDate role department team phonenumber')
        .populate('leaderId', 'name')
        .sort({ name: 1 });
      
      // 각 팀의 빙고 카운트 계산 및 summary 생성
      const teamsWithSummary = await Promise.all(
        teams.map(async (team) => {
          await team.calculateBingoCount();
          const summary = await team.getSummary();
          return {
            ...team.toObject(),
            summary
          };
        })
      );
      
      res.json(teamsWithSummary);
    } catch (error) {
      console.error('조 목록 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 조 생성 (관리자)
router.post('/activities/:id/teams',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { membersPerTeam } = req.body;
      const activity = await Activity.findById(req.params.id)
        .populate('participants', 'gender birthDate preferredActivity role');
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      // 기존 조 삭제
      await Team.deleteMany({ activityId: req.params.id });
      
      // 참가자 데이터 준비
      const participants = activity.participants.map(p => ({
        _id: p._id,
        gender: p.gender,
        age: p.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() + 1 : 25,
        region: p.preferredActivity || '강남구',
        role: p.role,
        isStarter: p.role === 'starter'
      }));
      
      // 조 개수 계산
      const teamCount = Math.floor(participants.length / membersPerTeam);
      
      // 스마트 조 배정
      const groups = smartTeamAssignment(participants, teamCount);
      
      // DB에 저장
      const teams = [];
      for (let i = 0; i < groups.length; i++) {
        const team = new Team({
          name: `${i + 1}조`,
          activityId: req.params.id,
          members: groups[i].map(m => m._id),
          progress: activity.bingoMissions.map(mission => ({
            missionId: mission.id,
            completed: false,
            currentCount: 0
          }))
        });
        
        await team.save();
        teams.push(team);
      }
      
      // 조 정보 다시 조회
      const populatedTeams = await Team.find({ activityId: req.params.id })
        .populate('members', 'name gender birthDate role department team phonenumber')
        .sort({ name: 1 });
      
      res.json(populatedTeams);
    } catch (error) {
      console.error('조 생성 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 스마트 조 배정 함수
function smartTeamAssignment(participants, teamCount) {
  // 1. 기본 조 크기 계산
  const baseSize = Math.floor(participants.length / teamCount);
  const remainder = participants.length % teamCount;
  const teamSizes = Array(teamCount).fill(baseSize);
  for (let i = 0; i < remainder; i++) {
    teamSizes[i]++;
  }
  
  // 2. 초기 그룹 생성
  const groups = Array(teamCount).fill(null).map(() => []);
  
  // 3. 성별로 분리
  const males = participants.filter(p => p.gender === 'male');
  const females = participants.filter(p => p.gender === 'female');
  
  // 4. 각 조에 필요한 남녀 수 계산 (비율 유지)
  const maleRatio = males.length / participants.length;
  const maleSlots = teamSizes.map(size => Math.round(size * maleRatio));
  const femaleSlots = teamSizes.map((size, i) => size - maleSlots[i]);
  
  // 5. 나이순 정렬 (지그재그 배치로 나이 균형)
  const sortByAge = (arr) => arr.sort((a, b) => a.age - b.age);
  const zigzagOrder = (arr) => {
    const sorted = sortByAge(arr);
    const result = [];
    let left = 0, right = sorted.length - 1;
    let toggle = true;
    while (left <= right) {
      result.push(toggle ? sorted[left++] : sorted[right--]);
      toggle = !toggle;
    }
    return result;
  };
  
  // 6. 그리디 배정 (지역 거리 고려)
const assignToGroups = (pool, slots) => {
  const ordered = zigzagOrder(pool);
  
  for (const person of ordered) {
    let bestGroup = -1;
    let bestScore = Infinity;
    
    for (let gi = 0; gi < teamCount; gi++) {
      if (slots[gi] <= 0) continue;
      
      // 현재 그룹에 추가했을 때의 점수 계산
      const score = calculateGroupScore(groups[gi], person);
      
      if (score < bestScore || (score === bestScore && groups[gi].length < groups[bestGroup]?.length)) {
        bestGroup = gi;
        bestScore = score;
      }
    }
    
    // 🔥 안전 장치 추가
    if (bestGroup === -1) {
      // 슬롯이 남은 첫 번째 그룹 찾기
      bestGroup = slots.findIndex(s => s > 0);
    }
    
    // 여전히 그룹을 찾지 못했다면 첫 번째 그룹에 배정
    if (bestGroup === -1) {
      bestGroup = 0;
    }
    
    groups[bestGroup].push(person);
    slots[bestGroup]--;
  }
};
  
  assignToGroups([...males], [...maleSlots]);
  assignToGroups([...females], [...femaleSlots]);
  
  // 7. 스타터 최소 인원 체크 및 재배치
  ensureStarterDistribution(groups);
  
  // 8. 교환을 통한 최적화 (선택적)
  optimizeBySwaps(groups, 1000);
  
  return groups;
}

// 그룹 점수 계산 (낮을수록 좋음)
function calculateGroupScore(group, newPerson) {
  if (group.length === 0) return 0;
  
  let score = 0;
  
  // 지역 거리 패널티
  for (const member of group) {
    const distance = getRegionDistance(member.region, newPerson.region);
    score += distance > 2 ? 10 : distance; // 2칸 이상 떨어지면 큰 패널티
  }
  
  // 나이 차이 패널티
  const ages = [...group.map(m => m.age), newPerson.age];
  const ageDiff = Math.max(...ages) - Math.min(...ages);
  score += ageDiff > 6 ? (ageDiff - 6) * 5 : 0;
  
  return score;
}

// 서울 25개 구 거리 계산 (BFS)
const SEOUL_ADJACENCY = {
  "종로구": ["은평구","서대문구","중구","용산구","성북구","동대문구"],
  "중구": ["종로구","용산구","성동구","동대문구","마포구"],
  // ... 전체 인접 정보
};

function getRegionDistance(region1, region2) {
  if (region1 === region2) return 0;
  
  const queue = [[region1, 0]];
  const visited = new Set([region1]);
  
  while (queue.length > 0) {
    const [current, dist] = queue.shift();
    const neighbors = SEOUL_ADJACENCY[current] || [];
    
    for (const neighbor of neighbors) {
      if (neighbor === region2) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  
  return 100; // 연결되지 않음
}

// 스타터 분배 보장
function ensureStarterDistribution(groups) {
  const starters = groups.flatMap((g, gi) => 
    g.filter(m => m.isStarter).map(m => ({...m, groupIndex: gi}))
  );
  
  // 각 조의 스타터 수 계산
  const starterCounts = groups.map(g => g.filter(m => m.isStarter).length);
  
  // 스타터가 5명 미만인 조 찾기
  for (let gi = 0; gi < groups.length; gi++) {
    if (starterCounts[gi] < 5 && starters.length >= groups.length * 5) {
      // 스타터가 많은 조에서 가져오기
      // (실제 구현 필요)
    }
  }
}

// 교환을 통한 최적화
function optimizeBySwaps(groups, iterations) {
  // 성별이 같은 멤버끼리만 교환
  for (let iter = 0; iter < iterations; iter++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    
    // 무작위 2개 조 선택
    const g1 = Math.floor(Math.random() * groups.length);
    let g2 = Math.floor(Math.random() * groups.length);
    while (g2 === g1) g2 = Math.floor(Math.random() * groups.length);
    
    // 해당 성별 멤버 찾기
    const members1 = groups[g1].filter(m => m.gender === gender);
    const members2 = groups[g2].filter(m => m.gender === gender);
    
    if (members1.length === 0 || members2.length === 0) continue;
    
    // 무작위 교환
    const idx1 = Math.floor(Math.random() * members1.length);
    const idx2 = Math.floor(Math.random() * members2.length);
    
    // 점수 계산 후 개선되면 유지
    const beforeScore = calculateTotalScore(groups);
    
    [members1[idx1], members2[idx2]] = [members2[idx2], members1[idx1]];
    
    const afterScore = calculateTotalScore(groups);
    
    if (afterScore > beforeScore) {
      // 원복
      [members1[idx1], members2[idx2]] = [members2[idx2], members1[idx1]];
    }
  }
}

function calculateTotalScore(groups) {
  return groups.reduce((sum, group) => {
    return sum + group.reduce((gscore, member, idx) => {
      return gscore + calculateGroupScore(group.slice(0, idx), member);
    }, 0);
  }, 0);
}

// 조장 지정 (관리자)
router.put('/teams/:id/leader',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { leaderId } = req.body;
      const team = await Team.findById(req.params.id);
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      team.leaderId = leaderId || null;
      await team.save();
      
      await team.populate('leaderId', 'name');
      res.json(team);
    } catch (error) {
      console.error('조장 지정 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 조 이름 수정 (조장만 가능)
router.patch('/teams/:teamId/name',
  authenticateToken,
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name } = req.body;
      const userId = req.user.id;

      // 조 찾기
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }

      // 조장 권한 확인
      if (!team.leaderId || team.leaderId.toString() !== userId) {
        return res.status(403).json({ message: '조장만 조 이름을 수정할 수 있습니다.' });
      }

      // 조 이름 업데이트
      team.name = name;
      await team.save();

      // 업데이트된 조 반환
      const updatedTeam = await Team.findById(teamId)
        .populate('members', 'name gender birthDate role')
        .populate('leaderId', 'name')
        .populate('activityId');

      res.json(updatedTeam);
    } catch (error) {
      console.error('조 이름 수정 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);
// 조원 추가 (관리자)
router.post('/teams/:id/members/add',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { userId } = req.body;
      const team = await Team.findById(req.params.id)
        .populate('activityId');
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 이미 조원인지 확인
      if (team.members.includes(userId)) {
        return res.status(400).json({ message: '이미 조원입니다.' });
      }
      
      // 활동 참가자인지 확인
      const activity = team.activityId;
      if (!activity.participants.includes(userId)) {
        return res.status(400).json({ message: '활동 참가자가 아닙니다.' });
      }
      
      // 다른 조에 속해있는지 확인
      const existingTeam = await Team.findOne({
        activityId: activity._id,
        members: userId
      });
      
      if (existingTeam) {
        return res.status(400).json({ 
          message: `이미 ${existingTeam.name}에 속해있습니다. 먼저 해당 조에서 제거해주세요.` 
        });
      }
      
      // 조원 추가
      team.members.push(userId);
      
      // 미션 진행 상태 초기화 (새 조원용)
      if (team.progress.length === 0 && activity.bingoMissions.length > 0) {
        team.progress = activity.bingoMissions.map(mission => ({
          missionId: mission.id,
          completed: false,
          currentCount: 0
        }));
      }
      
      await team.save();
      await team.populate('members', 'name role department team');
      await team.populate('leaderId', 'name');
      
      res.json(team);
    } catch (error) {
      console.error('조원 추가 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 조원 제거 (관리자)
router.post('/teams/:id/members/remove',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { userId } = req.body;
      const team = await Team.findById(req.params.id);
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 조원 제거
      team.members = team.members.filter(memberId => memberId.toString() !== userId);
      
      // 조장이었다면 조장 해제
      if (team.leaderId && team.leaderId.toString() === userId) {
        team.leaderId = null;
      }
      
      await team.save();
      await team.populate('members', 'name role department team');
      await team.populate('leaderId', 'name');
      
      res.json(team);
    } catch (error) {
      console.error('조원 제거 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 조원 이동 (관리자) - 한 조에서 다른 조로
router.post('/teams/:id/members/move',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { userId, targetTeamId } = req.body;
      const sourceTeam = await Team.findById(req.params.id);
      const targetTeam = await Team.findById(targetTeamId)
        .populate('activityId');
      
      if (!sourceTeam || !targetTeam) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 같은 활동의 조인지 확인
      if (sourceTeam.activityId.toString() !== targetTeam.activityId.toString()) {
        return res.status(400).json({ message: '같은 활동의 조로만 이동할 수 있습니다.' });
      }
      
      // 원본 조에서 제거
      sourceTeam.members = sourceTeam.members.filter(memberId => memberId.toString() !== userId);
      
      // 조장이었다면 조장 해제
      if (sourceTeam.leaderId && sourceTeam.leaderId.toString() === userId) {
        sourceTeam.leaderId = null;
      }
      
      // 대상 조에 추가
      if (!targetTeam.members.includes(userId)) {
        targetTeam.members.push(userId);
      }
      
      await sourceTeam.save();
      await targetTeam.save();
      
      await sourceTeam.populate('members', 'name role department team');
      await targetTeam.populate('members', 'name role department team');
      
      res.json({ 
        sourceTeam, 
        targetTeam,
        message: '조원이 성공적으로 이동되었습니다.' 
      });
    } catch (error) {
      console.error('조원 이동 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 미배정 인원 조회 (관리자)
router.get('/activities/:id/unassigned',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id)
        .populate('participants', 'name role department team');
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      // 활동의 모든 조 조회
      const teams = await Team.find({ activityId: req.params.id });
      
      // 모든 조의 조원 ID 수집
      const assignedMemberIds = new Set();
      teams.forEach(team => {
        team.members.forEach(memberId => {
          assignedMemberIds.add(memberId.toString());
        });
      });
      
      // 미배정 인원 필터링
      const unassignedMembers = activity.participants.filter(
        participant => !assignedMemberIds.has(participant._id.toString())
      );
      
      res.json(unassignedMembers);
    } catch (error) {
      console.error('미배정 인원 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);
// ============== 빙고 진행상황 API ==============

// 미션 완료 토글 (관리자)
router.post('/teams/:id/missions/:missionId/toggle',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      const progress = await team.toggleMission(
        parseInt(req.params.missionId), 
        req.user.id
      );
      
      res.json({ progress, bingoCount: team.bingoCount });
    } catch (error) {
      console.error('미션 토글 에러:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// 카운트 미션 조정 (관리자)
router.post('/teams/:id/missions/:missionId/adjust',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const { increment } = req.body;
      const team = await Team.findById(req.params.id);
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      const progress = await team.adjustMissionCount(
        parseInt(req.params.missionId),
        increment,
        req.user.id
      );
      
      res.json({ progress, bingoCount: team.bingoCount });
    } catch (error) {
      console.error('미션 카운트 조정 에러:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// ============== 참가자용 API ==============

// 내가 참여한 활동 목록 - 팀 정보 포함
// routes/bingo.js
router.get('/my-activities',
  authenticateToken,
  async (req, res) => {
    try {
      const activities = await Activity.find({
        participants: req.user.id,
        isActive: true
      }).sort({ startDate: -1 });
      
      // 각 활동에 대한 팀 정보 추가
      const activitiesWithTeam = await Promise.all(
        activities.map(async (activity) => {
          const team = await Team.findOne({
            activityId: activity._id,
            members: req.user.id
          });
          
          const activityObj = activity.toObject();
          
          if (team) {
            await team.calculateBingoCount();
            activityObj.myTeam = {
              name: team.name,
              bingoCount: team.bingoCount,
              progressRate: team.getProgressRate(),
              completedMissions: team.progress.filter(p => p.completed).length
            };
          } else {
            activityObj.myTeam = null;
          }
          
          return activityObj;
        })
      );
      
      res.json(activitiesWithTeam);
    } catch (error) {
      console.error('내 활동 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// 내 조 정보 조회
router.get('/activities/:id/my-team',
  authenticateToken,
  async (req, res) => {
    try {
      const team = await Team.findOne({
        activityId: req.params.id,
        members: req.user.id
      })
      .populate('members', 'name role department team gender birthDate')
      .populate('leaderId', 'name')
      .populate('activityId', 'title description targetBingos bingoMissions');
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 빙고 카운트 계산
      await team.calculateBingoCount();
      
      // summary 정보 추가
      const summary = await team.getSummary();
      
      res.json({
        ...team.toObject(),
        summary
      });
    } catch (error) {
      console.error('내 조 조회 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// ============== 보상 처리 API ==============

// 활동 완료 및 보상 처리 (관리자)
router.post('/activities/:id/complete',
  authenticateToken,
  authorizeRoles('admin', 'officer'),
  async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      const result = await activity.processRewards();
      res.json(result);
    } catch (error) {
      console.error('보상 처리 에러:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

module.exports = router;
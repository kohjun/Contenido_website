// routes/bingo/teams.js
// 팀 관리 (조회/생성/조장/이름/멤버 add·remove·move/미배정) (이전: routes/bingo.js)

const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Team = require('../../models/Team');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');
const { smartTeamAssignment } = require('./_assignment');

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
        .populate('participants', 'name role department team phonenumber');
      
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


module.exports = router;

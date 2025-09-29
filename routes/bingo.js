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
        .populate('members', 'name role department team')
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
        .populate('participants');
      
      if (!activity) {
        return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
      }
      
      // 기존 조 삭제
      await Team.deleteMany({ activityId: req.params.id });
      
      // 참가자 랜덤 셔플
      const participants = [...activity.participants];
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
      
      // 조 생성
      const teams = [];
      const baseTeamCount = Math.floor(participants.length / membersPerTeam);
      let memberIndex = 0;
      
      // 기본 조 구성
      for (let i = 0; i < baseTeamCount; i++) {
        const teamMembers = participants.slice(memberIndex, memberIndex + membersPerTeam);
        
        const team = new Team({
          name: `${i + 1}조`,
          activityId: req.params.id,
          members: teamMembers.map(m => m._id),
          progress: activity.bingoMissions.map(mission => ({
            missionId: mission.id,
            completed: false,
            currentCount: 0
          }))
        });
        
        await team.save();
        teams.push(team);
        memberIndex += membersPerTeam;
      }
      
      // 남은 멤버들을 기존 조에 랜덤 배치
      const remainingMembers = participants.slice(memberIndex);
      for (let i = 0; i < remainingMembers.length; i++) {
        const randomTeamIndex = Math.floor(Math.random() * teams.length);
        teams[randomTeamIndex].members.push(remainingMembers[i]._id);
        await teams[randomTeamIndex].save();
      }
      
      // 조 정보 다시 조회 (populate 포함)
      const populatedTeams = await Team.find({ activityId: req.params.id })
        .populate('members', 'name role department team')
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

// 조 이름 변경 (조장)
router.put('/teams/:id/name',
  authenticateToken,
  async (req, res) => {
    try {
      const { name } = req.body;
      const team = await Team.findById(req.params.id);
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      // 조장 권한 확인
      if (team.leaderId?.toString() !== req.user.id) {
        return res.status(403).json({ message: '조장만 조 이름을 변경할 수 있습니다.' });
      }
      
      team.name = name;
      await team.save();
      
      res.json(team);
    } catch (error) {
      console.error('조 이름 변경 에러:', error);
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

// 내가 참여한 활동 목록
router.get('/my-activities',
  authenticateToken,
  async (req, res) => {
    try {
      const activities = await Activity.find({
        participants: req.user.id,
        isActive: true
      }).sort({ startDate: -1 });
      
      res.json(activities);
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
      .populate('members', 'name role department team')
      .populate('leaderId', 'name')
      .populate('activityId', 'title description targetBingos bingoMissions');
      
      if (!team) {
        return res.status(404).json({ message: '조를 찾을 수 없습니다.' });
      }
      
      await team.calculateBingoCount();
      res.json(team);
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
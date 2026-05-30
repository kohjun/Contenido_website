// routes/events/participants.js
// 참가자 신청/취소/승인 관련 라우트
// (이전: routes/events.js 의 170~238, 350~625)

const express = require('express');
const Event = require('../../models/Event');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles, requireActiveUser } = require('../../middleware/roleMiddleware');

const router = express.Router();

/* =========================================================================
   GET — 참가자 목록
   ========================================================================= */

// 참가자 정보 (운영진 전용)
router.get('/:id/participants',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id)
        .populate({
          path: 'appliedParticipants.userId',
          select: 'name displayName gender phonenumber birthDate role team preferredActivity participationCount'
        });

      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participants = event.appliedParticipants.map(participant => {
        const u = participant.userId || {};
        const totalCount = (u.participationCount && u.participationCount.totalCount) || 0;
        const regularCount = (u.participationCount && u.participationCount.regularCount) || 0;
        return {
          userId: u._id,
          name: u.name,
          displayName: u.displayName,
          gender: u.gender,
          phonenumber: u.phonenumber,
          status: participant.status,
          appliedAt: participant.appliedAt,
          answers: participant.answers,
          birthDate: u.birthDate,
          role: u.role,
          team: u.team,
          preferredActivity: u.preferredActivity,
          totalCount,
          regularCount,
        };
      });

      res.json({
        title: event.title,
        date: event.date,
        participants
      });
    } catch (error) {
      console.error('Error fetching participants:', error);
      res.status(500).json({ message: 'Error fetching participants' });
    }
  });

// 승인된 참가자 목록
router.get('/:id/approved-participants', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'appliedParticipants.userId',
        select: 'name phonenumber'
      });

    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const approvedParticipants = event.appliedParticipants
      .filter(p => p.status === 'approved')
      .map(p => ({
        id: p.userId._id,
        name: p.userId.name,
        phonenumber: p.userId.phonenumber,
        displayName: `${p.userId.name}${p.userId.phonenumber ? p.userId.phonenumber.slice(-4) : ''}`
      }));

    res.json(approvedParticipants);
  } catch (error) {
    console.error('Error fetching approved participants:', error);
    res.status(500).json({ message: '승인된 참가자 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   POST — 접근 코드 / 신청 / 취소
   ========================================================================= */

router.post('/:id/verify-access', authenticateToken, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }

    const isAdminMasterCode = req.user.role === 'admin' && accessCode === '1111';
    const isValid = await event.verifyAccessCode(accessCode);

    if (!isAdminMasterCode && !isValid) {
      return res.status(403).json({ message: '잘못된 접근 코드입니다.' });
    }

    req.session.eventAccess = req.session.eventAccess || {};
    req.session.eventAccess[req.params.id] = true;

    res.json({ message: '접근이 승인되었습니다.' });
  } catch (error) {
    console.error('Error verifying access code:', error);
    res.status(500).json({ message: '접근 코드 확인 중 오류가 발생했습니다.' });
  }
});

router.post('/:id/apply',
  authenticateToken,
  authorizeRoles('participant', 'starter', 'officer', 'admin'),
  requireActiveUser,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      if (event.isEnded) {
        return res.status(400).json({ message: '이미 종료된 이벤트입니다.' });
      }

      // 신청 기간 게이트
      const now = new Date();
      if (event.applicationStartAt && now < event.applicationStartAt) {
        return res.status(400).json({ message: '아직 신청 기간이 아닙니다.' });
      }
      if (event.applicationDeadlineAt && now > event.applicationDeadlineAt) {
        return res.status(400).json({ message: '신청 마감이 지났습니다.' });
      }

      // 신청 한도 (maxApplicants 우선, 없으면 participants 기준 — 기존 무제한 유지)
      if (event.maxApplicants && event.appliedParticipants.length >= event.maxApplicants) {
        return res.status(400).json({ message: '신청 한도를 초과했습니다.' });
      }

      if (event.appliedParticipants.some(p => p.userId.toString() === req.user.id)) {
        return res.status(400).json({ message: '이미 신청한 이벤트입니다.' });
      }

      const participantData = {
        userId: req.user.id,
        appliedAt: new Date(),
        status: 'pending'
      };

      // 선별적 이벤트인 경우 답변 처리
      if (event.isSelective && event.additionalQuestions.length > 0) {
        if (!req.body.answers) {
          return res.status(400).json({ message: '지원서 답변이 필요합니다.' });
        }
        if (req.body.answers.length !== event.additionalQuestions.length) {
          return res.status(400).json({ message: '모든 질문에 답변해주세요.' });
        }
        if (req.body.answers.some(answer => !answer.answerText.trim())) {
          return res.status(400).json({ message: '비어있는 답변이 있습니다.' });
        }
        participantData.answers = req.body.answers;
      }

      event.appliedParticipants.push(participantData);
      await event.save();

      res.json({ message: '신청이 완료되었습니다. 승인을 기다려주세요.' });
    } catch (error) {
      console.error('Error applying for event:', error);
      res.status(500).json({
        message: '이벤트 신청 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  });

router.post('/:id/cancel-application',
  authenticateToken,
  authorizeRoles('participant', 'starter', 'officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );

      if (!participant) {
        return res.status(400).json({ message: 'You have not applied for this event' });
      }

      if (participant.status === 'cancelled') {
        return res.status(400).json({ message: '이미 취소된 신청입니다.' });
      }

      // 삭제하지 않고 status='cancelled' + statusHistory 기록
      const previousStatus = participant.status || 'pending';
      if (!participant.statusHistory) participant.statusHistory = [];
      participant.statusHistory.push({
        previousStatus,
        newStatus: 'cancelled',
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name || '본인',
        isReset: false
      });
      participant.status = 'cancelled';

      await event.save();

      res.status(200).json({ message: '신청이 취소되었습니다.' });
    } catch (error) {
      console.error('Error canceling application:', error);
      res.status(500).json({ message: '신청 취소 중 오류가 발생했습니다.', error });
    }
  });

/* =========================================================================
   POST/GET — 참가자 상태 (승인/거절/초기화/이력)
   ========================================================================= */

router.post('/:eventId/participants/:userId/status',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const { status } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      // 승인 시 정원 확인
      if (status === 'approved') {
        const approvedCount = event.appliedParticipants.filter(
          p => p.status === 'approved'
        ).length;
        if (approvedCount >= event.participants) {
          return res.status(400).json({ message: '이미 정원이 다 찼습니다.' });
        }
      }

      if (!participant.statusHistory) participant.statusHistory = [];

      const previousStatus = participant.status || 'pending';
      participant.statusHistory.push({
        previousStatus,
        newStatus: status,
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name
      });

      participant.status = status;
      await event.save();

      res.json({ message: '참가자 상태가 업데이트되었습니다.' });
    } catch (error) {
      console.error('Error updating participant status:', error);
      res.status(500).json({ message: '상태 업데이트 중 오류가 발생했습니다.' });
    }
  });

router.post('/:eventId/participants/:userId/reset-status',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      if (participant.status === 'pending') {
        return res.status(400).json({ message: '이미 대기 상태입니다.' });
      }

      if (!participant.statusHistory) participant.statusHistory = [];

      const previousStatus = participant.status;
      participant.statusHistory.push({
        previousStatus,
        newStatus: 'pending',
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name,
        isReset: true
      });

      participant.status = 'pending';
      await event.save();

      res.json({
        message: '참가자 상태가 대기 상태로 되돌려졌습니다.',
        resetBy: req.user.name
      });
    } catch (error) {
      console.error('Error resetting participant status:', error);
      res.status(500).json({ message: '상태 되돌리기 중 오류가 발생했습니다.' });
    }
  });

router.get('/:eventId/participants/:userId/status-history',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      res.json({
        statusHistory: participant.statusHistory || [],
        currentStatus: participant.status || 'pending'
      });
    } catch (error) {
      console.error('Error fetching status history:', error);
      res.status(500).json({ message: '상태 이력 조회 중 오류가 발생했습니다.' });
    }
  });

module.exports = router;

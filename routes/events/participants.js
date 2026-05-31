// routes/events/participants.js
// 참가자 신청/취소/승인 관련 라우트
// (이전: routes/events.js 의 170~238, 350~625)

const express = require('express');
const Event = require('../../models/Event');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles, requireActiveUser } = require('../../middleware/roleMiddleware');
const { createNotification } = require('../../utils/notify');

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
          cancellationRequested: participant.cancellationRequested || false,
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

    // 마스터 코드 1111 — 관리자(admin)만 어떤 이벤트든 접근 가능. (운영진은 이벤트 고유 코드 사용)
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

      // 선별적 이벤트 답변 검증 (신규/재신청 공통)
      let answers = [];
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
        answers = req.body.answers;
      }

      const existing = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );

      if (existing) {
        // 활성 신청은 중복 불가
        if (existing.status === 'pending' || existing.status === 'approved') {
          return res.status(400).json({ message: '이미 신청한 이벤트입니다.' });
        }
        // 거절된 신청은 재신청 불가 (운영진 판단 존중)
        if (existing.status === 'rejected') {
          return res.status(400).json({ message: '신청이 거절되어 재신청할 수 없습니다. 운영진에게 문의해주세요.' });
        }
        // 본인 취소(cancelled) → 재신청: 이전 신청 이력을 분리 보관하고 새 시도 시작
        existing.previousAttempts = existing.previousAttempts || [];
        existing.previousAttempts.push({
          appliedAt: existing.appliedAt,
          statusHistory: (existing.statusHistory || []).map(h => ({
            previousStatus: h.previousStatus,
            newStatus: h.newStatus,
            changedBy: h.changedBy,
            changerName: h.changerName,
            changedAt: h.changedAt,
            isReset: h.isReset
          })),
          finalStatus: existing.status,
          closedAt: new Date()
        });
        existing.statusHistory = [];
        existing.status = 'pending';
        existing.appliedAt = new Date();
        existing.answers = answers;
      } else {
        // 신규 신청 — 한도 체크 (maxApplicants 있을 때만)
        if (event.maxApplicants && event.appliedParticipants.length >= event.maxApplicants) {
          return res.status(400).json({ message: '신청 한도를 초과했습니다.' });
        }
        event.appliedParticipants.push({
          userId: req.user.id,
          appliedAt: new Date(),
          status: 'pending',
          answers
        });
      }

      await event.save();

      // 주최 운영진에게 새 신청 알림 (비치명적)
      if (event.creator && event.creator.toString() !== req.user.id) {
        createNotification({
          userId: event.creator,
          type: 'application_received',
          title: `[${event.title}] ${existing ? '재신청자' : '새 신청자'}가 있습니다`,
          link: `/event-status-staff.html?id=${event._id}`,
          meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status: 'pending' },
        });
      }

      res.json({ message: existing ? '재신청이 완료되었습니다. 승인을 기다려주세요.' : '신청이 완료되었습니다. 승인을 기다려주세요.' });
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

// 참가확정자의 '취소 요청' — 직접 취소하지 않고 담당 운영진에게 알림만 보냄
router.post('/:id/request-cancellation',
  authenticateToken,
  authorizeRoles('participant', 'starter', 'officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );
      if (!participant) {
        return res.status(400).json({ message: '신청 내역이 없습니다.' });
      }
      if (participant.status !== 'approved') {
        return res.status(400).json({ message: '참가가 확정된 신청만 취소를 요청할 수 있습니다.' });
      }
      if (participant.cancellationRequested) {
        return res.status(400).json({ message: '이미 취소 요청을 보냈습니다. 담당 운영진의 처리를 기다려주세요.' });
      }

      participant.cancellationRequested = true;
      participant.cancellationRequestedAt = new Date();
      await event.save();

      // 담당 운영진(이벤트 생성자)에게 알림 (비치명적)
      if (event.creator && event.creator.toString() !== req.user.id) {
        createNotification({
          userId: event.creator,
          type: 'cancellation_requested',
          title: `[${event.title}] ${req.user.name || '참가자'}님이 참가 취소를 요청했습니다`,
          link: `/event-status-staff.html?id=${event._id}`,
          meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status: 'approved' },
        });
      }

      res.json({ message: '취소 요청이 담당 운영진에게 전달되었습니다.' });
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      res.status(500).json({ message: '취소 요청 중 오류가 발생했습니다.' });
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

      // 참가자에게 상태 변경 알림 (비치명적, 본인이 본인 상태 바꾼 경우 제외)
      if ((status === 'approved' || status === 'rejected') && userId !== req.user.id) {
        const approved = status === 'approved';
        createNotification({
          userId,
          type: approved ? 'participation_confirmed' : 'participation_rejected',
          title: approved ? `[${event.title}] 참가가 확정되었습니다` : `[${event.title}] 참가가 반려되었습니다`,
          link: '/mypage.html',
          meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status },
        });
      }

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

      // 본인이 취소한 신청은 운영진이 임의로 되돌릴 수 없음 (재신청은 본인만 가능)
      if (participant.status === 'cancelled') {
        return res.status(400).json({ message: '본인이 취소한 신청은 대기 상태로 되돌릴 수 없습니다. (본인 재신청만 가능)' });
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
      // 대기로 되돌리면 기존 취소 요청은 무효화
      participant.cancellationRequested = false;
      participant.cancellationRequestedAt = null;
      await event.save();

      // 참가확정(approved)이 취소되어 대기로 전환된 경우 참가자에게 알림 (비치명적, 본인 처리 제외)
      if (previousStatus === 'approved' && userId !== req.user.id) {
        createNotification({
          userId,
          type: 'confirmation_revoked',
          title: `[${event.title}] 참가 확정이 취소되어 대기 상태로 변경되었습니다`,
          link: '/mypage.html',
          meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status: 'pending' },
        });
      }

      res.json({
        message: '참가자 상태가 대기 상태로 되돌려졌습니다.',
        resetBy: req.user.name
      });
    } catch (error) {
      console.error('Error resetting participant status:', error);
      res.status(500).json({ message: '상태 되돌리기 중 오류가 발생했습니다.' });
    }
  });

// 담당 운영진이 '취소 요청'을 처리 — 참가자를 cancelled 상태로 전환
router.post('/:eventId/participants/:userId/process-cancellation',
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
      if (participant.status === 'cancelled') {
        return res.status(400).json({ message: '이미 취소된 신청입니다.' });
      }

      if (!participant.statusHistory) participant.statusHistory = [];
      participant.statusHistory.push({
        previousStatus: participant.status || 'approved',
        newStatus: 'cancelled',
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name,
        isReset: false
      });
      participant.status = 'cancelled';
      participant.cancellationRequested = false;
      participant.cancellationRequestedAt = null;
      await event.save();

      // 참가자에게 취소 처리 알림 (비치명적, 본인이 본인 처리한 경우 제외)
      if (userId !== req.user.id) {
        createNotification({
          userId,
          type: 'cancellation_processed',
          title: `[${event.title}] 참가가 취소 처리되었습니다`,
          link: '/mypage.html',
          meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status: 'cancelled' },
        });
      }

      res.json({ message: '취소 처리가 완료되었습니다.', processedBy: req.user.name });
    } catch (error) {
      console.error('Error processing cancellation:', error);
      res.status(500).json({ message: '취소 처리 중 오류가 발생했습니다.' });
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
        previousAttempts: participant.previousAttempts || [],
        currentStatus: participant.status || 'pending'
      });
    } catch (error) {
      console.error('Error fetching status history:', error);
      res.status(500).json({ message: '상태 이력 조회 중 오류가 발생했습니다.' });
    }
  });

module.exports = router;

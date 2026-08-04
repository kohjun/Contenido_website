// routes/events/participants.js
// 참가자 신청/취소/승인 관련 라우트
// (이전: routes/events.js 의 170~238, 350~625)

const express = require('express');
const Event = require('../../models/Event');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles, requireActiveUser } = require('../../middleware/roleMiddleware');
const { createNotification } = require('../../utils/notify');
const { upload, handleMulterError, processAndSaveImages } = require('./_multer');

const { generateInviteToken, decodeInviteToken } = require('../../utils/inviteToken');

const router = express.Router();

/* =========================================================================
   GET — 참가자 목록 및 초대 토큰
   ========================================================================= */

// 초대 토큰 발급 (마이페이지용)
router.get('/:id/invite-token',
  authenticateToken,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      if (!event.allowCompanions) return res.status(400).json({ message: '지인 동반이 허용되지 않은 이벤트입니다.' });

      const token = generateInviteToken(req.params.id, req.user.id);
      res.json({ inviteToken: token });
    } catch (error) {
      console.error('Error generating invite token:', error);
      res.status(500).json({ message: '초대 토큰 생성 중 오류가 발생했습니다.' });
    }
  });

// 초대한 부원 정보 조회 (암호화 토큰 또는 inviterId 지원)
router.get('/:id/inviter-info', async (req, res) => {
  try {
    const { invite, inviterId: rawInviterId } = req.query;
    let targetInviterId = rawInviterId;

    if (invite) {
      const decoded = decodeInviteToken(invite);
      if (!decoded || decoded.eventId !== req.params.id) {
        return res.status(400).json({ message: '유효하지 않거나 변조된 초대장 링크입니다.' });
      }
      targetInviterId = decoded.inviterUserId;
    }

    if (!targetInviterId) {
      return res.status(400).json({ message: '초대자 정보가 필요합니다.' });
    }

    const inviter = await User.findById(targetInviterId).select('name displayName phonenumber').lean();
    if (!inviter) {
      return res.status(404).json({ message: '초대자 정보를 찾을 수 없습니다.' });
    }
    const name = inviter.name || inviter.displayName || '부원';
    const digits = String(inviter.phonenumber || '').replace(/[^0-9]/g, '');
    const phoneTail = digits.length >= 4 ? digits.slice(-4) : digits;

    res.json({
      inviterId: inviter._id,
      name,
      phoneTail,
      displayLabel: `${name} (${phoneTail})`
    });
  } catch (error) {
    console.error('Error fetching inviter info:', error);
    res.status(500).json({ message: 'Error fetching inviter info' });
  }
});

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

      // 접근 권한 검증:
      // admin, 이벤트 생성자(creator), 또는 접근 코드 입력 성공 세션(eventAccess) 보유자만 허용
      const isAdmin = req.user.role === 'admin';
      const isCreator = event.creator.toString() === req.user.id;
      const hasVerifiedAccess = req.session && req.session.eventAccess && req.session.eventAccess[req.params.id] === true;

      if (!isAdmin && !isCreator && !hasVerifiedAccess) {
        return res.status(403).json({ message: '이벤트 접근 코드를 확인한 후 다시 시도해 주세요.' });
      }

      const participants = event.appliedParticipants.map(participant => {
        const u = participant.userId || {};
        const totalCount = (u.participationCount && u.participationCount.totalCount) || 0;
        const regularCount = (u.participationCount && u.participationCount.regularCount) || 0;
        return {
          _id: participant._id ? participant._id.toString() : null,
          userId: u._id,
          name: participant.isGuest && participant.guestInfo ? participant.guestInfo.name : u.name,
          displayName: participant.isGuest && participant.guestInfo ? participant.guestInfo.name : u.displayName,
          gender: participant.isGuest && participant.guestInfo ? participant.guestInfo.gender : u.gender,
          phonenumber: participant.isGuest && participant.guestInfo ? participant.guestInfo.phone : u.phonenumber,
          age: participant.isGuest && participant.guestInfo ? participant.guestInfo.age : null,
          status: participant.status,
          cancellationRequested: participant.cancellationRequested || false,
          appliedAt: participant.appliedAt,
          answers: participant.answers,
          birthDate: u.birthDate,
          role: participant.isGuest ? 'guest' : u.role,
          team: u.team,
          preferredActivity: u.preferredActivity,
          totalCount,
          regularCount,
          verification: participant.verification,
          companions: participant.companions || [],
          inviterUserId: participant.inviterUserId ? participant.inviterUserId.toString() : null,
          isGuest: !!participant.isGuest,
          guestInfo: participant.guestInfo || null
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

// 승인된 참가자 목록 (운영진/스태프 전용 - 접근 코드 세션 검증)
router.get('/:id/approved-participants',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id)
        .populate({
          path: 'appliedParticipants.userId',
          select: 'name phonenumber'
        });

      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      // 접근 권한 검증: admin, 이벤트 생성자, 또는 접근 코드 인증 성공 세션만 허용
      const isAdmin = req.user.role === 'admin';
      const isCreator = event.creator.toString() === req.user.id;
      const hasVerifiedAccess = req.session && req.session.eventAccess && req.session.eventAccess[req.params.id] === true;

      if (!isAdmin && !isCreator && !hasVerifiedAccess) {
        return res.status(403).json({ message: '이벤트 접근 코드를 확인한 후 다시 시도해 주세요.' });
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

      // 동반 지인 정보 처리
      let companions = [];
      if (req.body.companions) {
        try {
          companions = typeof req.body.companions === 'string' ? JSON.parse(req.body.companions) : req.body.companions;
          if (!Array.isArray(companions)) companions = [];
        } catch (e) {
          companions = [];
        }
      }

      if (companions.length > 0) {
        if (!event.allowCompanions) {
          return res.status(400).json({ message: '해당 이벤트는 지인 동반 신청을 허용하지 않습니다.' });
        }
        const maxAllowed = event.maxCompanionsPerUser || 1;
        if (companions.length > maxAllowed) {
          return res.status(400).json({ message: `지인 동반은 인당 최대 ${maxAllowed}명까지만 신청할 수 있습니다.` });
        }
        for (const c of companions) {
          if (!c.name || !c.name.trim() || !c.phone || !c.phone.trim() || !c.age) {
            return res.status(400).json({ message: '동반 지인의 이름, 연락처, 나이를 모두 입력해 주세요.' });
          }
          if (c.age) c.age = parseInt(c.age);
          if (!c.gender) c.gender = 'male';
        }
      }

      const existing = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );

      // seat count: 본인(1) + 지인 수
      const requestedSeats = 1 + companions.length;

      // 1) 번개 이벤트인 경우: 신청과 동시에 자동 승인(approved)되므로 정원(participants) 검증
      if (event.isLightning && event.participants) {
        const approvedSeats = event.appliedParticipants
          .filter(p => p.status === 'approved' && (!existing || p._id.toString() !== existing._id.toString()))
          .reduce((sum, p) => sum + 1 + ((p.companions && p.companions.length) || 0), 0);

        if (approvedSeats + requestedSeats > event.participants) {
          const remaining = Math.max(0, event.participants - approvedSeats);
          return res.status(400).json({ message: `번개 이벤트 정원을 초과합니다. (잔여 자릿수: ${remaining}석, 신청 요구: ${requestedSeats}석)` });
        }
      }

      // 2) 최대 신청자 수(maxApplicants)가 설정되어 있는 경우: 총 신청자(pending + approved + 지인) 한도 검증
      if (event.maxApplicants) {
        const totalActiveSeats = event.appliedParticipants
          .filter(p => (p.status === 'approved' || p.status === 'pending') && (!existing || p._id.toString() !== existing._id.toString()))
          .reduce((sum, p) => sum + 1 + ((p.companions && p.companions.length) || 0), 0);

        if (totalActiveSeats + requestedSeats > event.maxApplicants) {
          const remaining = Math.max(0, event.maxApplicants - totalActiveSeats);
          return res.status(400).json({ message: `신청 한도(최대 ${event.maxApplicants}명)를 초과했습니다. (잔여 신청 자릿수: ${remaining}석)` });
        }
      }

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
        existing.status = event.isLightning ? 'approved' : 'pending';
        existing.appliedAt = new Date();
        existing.answers = answers;
        existing.companions = companions;
      } else {
        event.appliedParticipants.push({
          userId: req.user.id,
          appliedAt: new Date(),
          status: event.isLightning ? 'approved' : 'pending',
          answers,
          companions
        });
      }

      await event.save();

      // 주최 운영진에게 새 신청 알림 (비치명적)
      if (event.creator && event.creator.toString() !== req.user.id) {
        createNotification({
          userId: event.creator,
          type: 'application_received',
          title: event.isLightning
            ? `[${event.title}] 새 번개 신청이 등록 및 자동 승인되었습니다`
            : `[${event.title}] ${existing ? '재신청자' : '새 신청자'}가 있습니다`,
          link: `/event-status-staff.html?id=${event._id}`,
          meta: {
            eventId: event._id,
            eventTitle: event.title,
            actorName: req.user.name,
            status: event.isLightning ? 'approved' : 'pending'
          },
        });
      }

      if (event.isLightning) {
        return res.json({ message: '신청이 완료되어 자동으로 참가 확정(1차 승인)되었습니다. 이벤트 진행 후 인증을 제출해 주세요!' });
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

/* =========================================================================
   POST — 초대장(Approach 2)으로 지인 신청 접수
   ========================================================================= */
router.post('/:id/apply-companion', async (req, res) => {
  try {
    const { inviteToken, invite, inviterUserId: rawInviterUserId, guestInfo, answers } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    }
    if (event.isEnded) {
      return res.status(400).json({ message: '이미 종료된 이벤트입니다.' });
    }
    if (!event.allowCompanions) {
      return res.status(400).json({ message: '해당 이벤트는 지인 동반 신청을 허용하지 않습니다.' });
    }

    let inviterUserId = rawInviterUserId;
    const tokenToDecode = inviteToken || invite;
    if (tokenToDecode) {
      const decoded = decodeInviteToken(tokenToDecode);
      if (!decoded || decoded.eventId !== req.params.id) {
        return res.status(400).json({ message: '유효하지 않거나 변조된 초대장 토큰입니다.' });
      }
      inviterUserId = decoded.inviterUserId;
    }

    if (!inviterUserId) {
      return res.status(400).json({ message: '초대한 부원의 정보가 누락되었습니다.' });
    }
    if (!guestInfo || !guestInfo.name || !guestInfo.phone || !guestInfo.age) {
      return res.status(400).json({ message: '지인의 이름, 연락처, 성별, 나이를 모두 입력해 주세요.' });
    }

    // 초대한 부원의 활성 신청 여부 검증
    const inviterApp = event.appliedParticipants.find(
      p => p.userId.toString() === inviterUserId && (p.status === 'pending' || p.status === 'approved')
    );
    if (!inviterApp) {
      return res.status(400).json({ message: '초대한 부원의 활성 신청이 없거나 신청이 취소되어 지인 신청이 불가능합니다.' });
    }

    // 초대한 부원이 이미 초대한 지인 수 검증
    const existingCompanions = event.appliedParticipants.filter(
      p => p.inviterUserId && p.inviterUserId.toString() === inviterUserId && p.status !== 'cancelled'
    );
    const maxAllowed = event.maxCompanionsPerUser || 1;
    if (existingCompanions.length >= maxAllowed) {
      return res.status(400).json({ message: `해당 부원의 지인 동반 신청 한도(최대 ${maxAllowed}명)를 초과했습니다.` });
    }

    // 최대 신청자 수(maxApplicants)가 설정되어 있는 경우에만 전체 신청자 한도 검증
    if (event.maxApplicants) {
      const totalActive = event.appliedParticipants.filter(
        p => p.status === 'pending' || p.status === 'approved'
      ).length;
      if (totalActive >= event.maxApplicants) {
        return res.status(400).json({ message: `이벤트 신청 한도(최대 ${event.maxApplicants}명)를 초과했습니다.` });
      }
    }

    // 중복 지인 신청 검증 (동일 전화번호)
    const cleanPhone = String(guestInfo.phone).replace(/[^0-9]/g, '');
    const duplicateGuest = event.appliedParticipants.find(
      p => p.isGuest && p.guestInfo && String(p.guestInfo.phone).replace(/[^0-9]/g, '') === cleanPhone && p.status !== 'cancelled'
    );
    if (duplicateGuest) {
      return res.status(400).json({ message: '이미 동일한 연락처로 접수된 지인 신청이 있습니다.' });
    }

    // 신규 지인 신청 저장
    event.appliedParticipants.push({
      userId: inviterUserId,
      inviterUserId: inviterUserId,
      isGuest: true,
      guestInfo: {
        name: guestInfo.name.trim(),
        phone: guestInfo.phone.trim(),
        gender: guestInfo.gender || 'male',
        age: parseInt(guestInfo.age) || 20
      },
      appliedAt: new Date(),
      status: event.isLightning ? 'approved' : 'pending',
      answers: answers || []
    });

    await event.save();

    res.json({ message: '지인 동반 신청이 완료되었습니다. 승인을 기다려주세요!' });
  } catch (error) {
    console.error('Error applying companion:', error);
    res.status(500).json({ message: '지인 신청 접수 중 오류가 발생했습니다.', error: error.message });
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
        p => p.userId.toString() === req.user.id && !p.isGuest
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

      // 동반 연쇄 취소: 이 부원이 초대한 지인들의 신청도 함께 취소 처리
      const linkedCompanions = event.appliedParticipants.filter(
        p => p.inviterUserId && p.inviterUserId.toString() === req.user.id && p.status !== 'cancelled'
      );

      for (const comp of linkedCompanions) {
        const prev = comp.status || 'pending';
        if (!comp.statusHistory) comp.statusHistory = [];
        comp.statusHistory.push({
          previousStatus: prev,
          newStatus: 'cancelled',
          changedBy: req.user.id,
          changedAt: new Date(),
          changerName: `초대자 취소로 인한 동반 취소`,
          isReset: false
        });
        comp.status = 'cancelled';
        comp.cancellationRequested = false;
      }

      await event.save();

      res.status(200).json({ message: '신청이 취소되었습니다. (동반 지인 신청도 함께 취소됨)' });
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
        p => p.userId.toString() === userId && !p.isGuest
      ) || event.appliedParticipants.find(
        p => p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(404).json({ message: '참가자를 찾을 수 없습니다.' });
      }

      // 승인 시 정원 확인
      if (status === 'approved' && participant.status !== 'approved') {
        const approvedCount = event.appliedParticipants.filter(
          p => p.status === 'approved'
        ).length;

        if (event.participants && approvedCount >= event.participants) {
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

      // 부원이 거절(rejected)된 경우, 해당 부원이 초대한 지인들도 함께 거절 처리
      if (status === 'rejected') {
        const linkedGuests = event.appliedParticipants.filter(
          g => g.isGuest && g.inviterUserId && g.inviterUserId.toString() === userId && g.status !== 'cancelled'
        );
        linkedGuests.forEach(guest => {
          if (!guest.statusHistory) guest.statusHistory = [];
          guest.statusHistory.push({
            previousStatus: guest.status || 'pending',
            newStatus: 'rejected',
            changedBy: req.user.id,
            changedAt: new Date(),
            changerName: req.user.name
          });
          guest.status = 'rejected';
        });
      }

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

      res.json({ message: status === 'approved' ? '참가 부원이 승인되었습니다. (동반 지인은 개별 승인 필요)' : '참가자 상태가 업데이트되었습니다.' });
    } catch (error) {
      console.error('Error updating participant status:', error);
      res.status(500).json({ message: '상태 업데이트 중 오류가 발생했습니다.' });
    }
  });

/* =========================================================================
   POST — 지인 동반 신청자 개별 승인/거절/초기화
   ========================================================================= */
router.post('/:eventId/guests/:guestId/status',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, guestId } = req.params;
      const { status } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const guest = event.appliedParticipants.find(
        p => p._id.toString() === guestId && p.isGuest
      );
      if (!guest) {
        return res.status(404).json({ message: '동반 지인 신청 건을 찾을 수 없습니다.' });
      }

      // 지인을 승인하려는 경우: 초대한 부원의 참가가 확정(approved)된 상태인지 검증!
      if (status === 'approved') {
        const inviter = event.appliedParticipants.find(
          p => !p.isGuest && p.userId.toString() === guest.inviterUserId.toString()
        );
        if (!inviter || inviter.status !== 'approved') {
          return res.status(400).json({ message: '초대한 부원의 참가가 확정(승인)된 후에만 동반 지인을 승인할 수 있습니다.' });
        }

        const approvedCount = event.appliedParticipants.filter(
          p => p.status === 'approved'
        ).length;
        if (event.participants && approvedCount >= event.participants) {
          return res.status(400).json({ message: '이벤트 정원이 마감되었습니다.' });
        }
      }

      if (!guest.statusHistory) guest.statusHistory = [];
      const previousStatus = guest.status || 'pending';
      guest.statusHistory.push({
        previousStatus,
        newStatus: status,
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name
      });
      guest.status = status;

      await event.save();

      res.json({ message: status === 'approved' ? '동반 지인이 승인되었습니다.' : '동반 지인 신청이 거절되었습니다.' });
    } catch (error) {
      console.error('Error updating guest status:', error);
      res.status(500).json({ message: '지인 상태 업데이트 중 오류가 발생했습니다.' });
    }
  });

router.post('/:eventId/guests/:guestId/reset-status',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, guestId } = req.params;
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      const guest = event.appliedParticipants.find(
        p => p._id.toString() === guestId && p.isGuest
      );
      if (!guest) {
        return res.status(404).json({ message: '동반 지인 신청 건을 찾을 수 없습니다.' });
      }

      if (!guest.statusHistory) guest.statusHistory = [];
      guest.statusHistory.push({
        previousStatus: guest.status,
        newStatus: 'pending',
        changedBy: req.user.id,
        changedAt: new Date(),
        changerName: req.user.name,
        isReset: true
      });
      guest.status = 'pending';

      await event.save();

      res.json({ message: '동반 지인 상태가 대기 상태로 되돌려졌습니다.' });
    } catch (error) {
      console.error('Error resetting guest status:', error);
      res.status(500).json({ message: '지인 상태 되돌리기 중 오류가 발생했습니다.' });
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
        p => p.userId.toString() === userId && !p.isGuest
      ) || event.appliedParticipants.find(
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

      // 부원이 초대한 동반 지인들도 함께 대기 상태로 복원
      const linkedGuests = event.appliedParticipants.filter(
        g => g.isGuest && g.inviterUserId && g.inviterUserId.toString() === userId && g.status !== 'cancelled'
      );
      linkedGuests.forEach(guest => {
        if (!guest.statusHistory) guest.statusHistory = [];
        guest.statusHistory.push({
          previousStatus: guest.status,
          newStatus: 'pending',
          changedBy: req.user.id,
          changedAt: new Date(),
          changerName: req.user.name,
          isReset: true
        });
        guest.status = 'pending';
      });

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

/* =========================================================================
   번개주최이벤트 전용 인증 및 관리 (2차 승인 / 경고 부여)
   ========================================================================= */

// 1) 번개 이벤트 인증 제출 (부원용)
router.post('/:eventId/verify',
  authenticateToken,
  upload.array('photo', 1),
  handleMulterError,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { textAnswers } = req.body; // textAnswers: [{"question": "...", "answer": "..."}]

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      if (!event.isLightning) {
        return res.status(400).json({ message: '번개주최이벤트가 아닙니다.' });
      }

      // 1차 승인 상태인지 확인
      const participant = event.appliedParticipants.find(
        p => p.userId.toString() === req.user.id
      );

      if (!participant || participant.status !== 'approved') {
        return res.status(403).json({ message: '참가 승인(1차 승인)된 부원만 인증할 수 있습니다.' });
      }

      // 신청기간 내인지 확인
      const now = new Date();
      if (event.applicationStartAt && now < event.applicationStartAt) {
        return res.status(400).json({ message: '아직 인증 제출 기간이 아닙니다.' });
      }

      let endLimit = event.applicationDeadlineAt;
      if (!endLimit) {
        // applicationDeadlineAt이 없으면 행사 시작 시간 기준
        const datePart = event.date.toISOString().split('T')[0];
        endLimit = new Date(`${datePart}T${event.startTime}:00`);
      }

      if (now > endLimit) {
        return res.status(400).json({ message: '인증 제출 기간이 만료되었습니다.' });
      }

      // 이미지 처리
      const savedImages = req.files ? await processAndSaveImages(req.files) : [];
      const photoPath = savedImages.length > 0 ? savedImages[0] : null;

      if (!photoPath) {
        return res.status(400).json({ message: '인증 사진을 업로드해주세요.' });
      }

      let parsedAnswers = [];
      if (textAnswers) {
        try {
          parsedAnswers = typeof textAnswers === 'string' ? JSON.parse(textAnswers) : textAnswers;
        } catch (e) {
          return res.status(400).json({ message: '답변 형식이 올바르지 않습니다.' });
        }
      }

      if (!Array.isArray(parsedAnswers) || parsedAnswers.length === 0) {
        return res.status(400).json({ message: '답변을 입력해주세요.' });
      }

      // 저장
      participant.verification = {
        textAnswers: parsedAnswers,
        photo: photoPath,
        submittedAt: now,
        status: 'pending'
      };

      await event.save();

      res.status(200).json({ message: '인증이 성공적으로 제출되었습니다. 운영진의 2차 승인을 기다려주세요.' });
    } catch (error) {
      console.error('Error submitting verification:', error);
      res.status(500).json({ message: '인증 제출 중 오류가 발생했습니다.', error: error.message });
    }
  }
);

// 2) 번개 이벤트 2차 승인 (운영진용)
router.post('/:eventId/participants/:userId/lightning-approve',
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

      if (participant.status !== 'approved') {
        return res.status(400).json({ message: '1차 승인된 참가자만 2차 승인 처리를 할 수 있습니다.' });
      }

      if (!participant.verification) {
        participant.verification = { textAnswers: [], status: 'none' };
      }

      participant.verification.status = 'approved';
      participant.verification.reviewedAt = new Date();
      participant.verification.reviewedBy = req.user.id;
      participant.verification.reviewedByName = req.user.name;

      await event.save();

      // 알림 전송 (인증 통과)
      createNotification({
        userId,
        type: 'participation_confirmed',
        title: `[${event.title}] 번개 모임 2차 승인이 완료되었습니다`,
        body: '번개 인증 통과로 경고가 부과되지 않습니다.',
        link: '/mypage.html',
        meta: { eventId: event._id, eventTitle: event.title, actorName: req.user.name, status: 'approved' },
      });

      res.json({ message: '2차 승인 처리가 완료되었습니다.' });
    } catch (error) {
      console.error('Error approving lightning verification:', error);
      res.status(500).json({ message: '2차 승인 처리 중 오류가 발생했습니다.' });
    }
  }
);

// 3) 번개 이벤트 경고 부여 (운영진용)
router.post('/:eventId/participants/:userId/lightning-warn',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { eventId, userId } = req.params;
      const { reason = '번개주최 미인증' } = req.body;

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

      if (participant.verification && participant.verification.status === 'rejected') {
        return res.status(400).json({ message: '이미 경고가 부여된 참가자입니다.' });
      }

      if (!participant.verification) {
        participant.verification = { textAnswers: [], status: 'none' };
      }

      participant.verification.status = 'rejected';
      participant.verification.reviewedAt = new Date();
      participant.verification.reviewedBy = req.user.id;
      participant.verification.reviewedByName = req.user.name;
      participant.verification.rejectReason = reason;

      await event.save();

      // 실제 User의 warningCount 증가 및 history 추가
      const user = await User.findById(userId);
      if (user) {
        const newWarning = {
          reason: `${reason} ([번개] ${event.title})`,
          issuedBy: req.user.id,
          issuedByName: req.user.name,
          category: '규칙위반',
          issuedAt: new Date()
        };
        user.warningHistory.push(newWarning);
        user.warningCount += 1;
        await user.save();

        // 경고 대상에게 알림
        createNotification({
          userId,
          type: 'warning_issued',
          title: '경고가 부여되었습니다',
          body: `사유: ${newWarning.reason}`,
          link: '/mypage.html',
          meta: { actorName: req.user.name, status: '규칙위반' },
        });
      }

      res.json({ message: '경고가 성공적으로 부여되었습니다.' });
    } catch (error) {
      console.error('Error issuing lightning warning:', error);
      res.status(500).json({ message: '경고 부여 중 오류가 발생했습니다.' });
    }
  }
);

module.exports = router;

// routes/events/admin.js
// 이벤트 운영 액션 (이미지 업로드, 보고서, 종료 처리)
// (이전: routes/events.js 의 312~347, 627~663, 793~812)

const express = require('express');
const Event = require('../../models/Event');
const User = require('../../models/User');
const authenticateToken = require('../../middleware/authMiddleware');
const { authorizeRoles } = require('../../middleware/roleMiddleware');
const { upload, handleMulterError, processAndSaveImages } = require('./_multer');

const router = express.Router();

/* =========================================================================
   POST — 이미지 업로드
   ========================================================================= */

router.post('/upload-images',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  upload.array('images', 3),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: '업로드된 이미지가 없습니다.' });
      }

      const eventId = req.body.eventId;
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      // admin 은 모든 이벤트 가능, officer 는 본인 생성 이벤트만
      if (req.user.role === 'officer' && event.creator.toString() !== req.user.id) {
        return res.status(403).json({
          message: '이벤트 생성자만 이미지를 업로드할 수 있습니다.'
        });
      }

      const newImages = await processAndSaveImages(req.files);

      res.json({
        message: '이미지가 성공적으로 업로드되었습니다.',
        images: newImages
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({ message: error.message || '이미지 업로드 중 오류가 발생했습니다.' });
    }
  });

/* =========================================================================
   POST — 결과 보고서 제출
   ========================================================================= */

router.post('/:id/report',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    const { participants } = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'Invalid input: participants missing' });
    }

    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      event.finalParticipants = participants.map(String);
      event.isEnded = true;
      await event.save();

      // 참가자들의 participationCount.regularCount 증가
      const updates = participants.map(participantId =>
        User.findByIdAndUpdate(participantId, {
          $inc: { 'participationCount.regularCount': 1 }
        })
      );
      await Promise.all(updates);

      res.status(200).json({ message: 'Report submitted and event marked as ended' });
    } catch (error) {
      console.error('Error submitting report:', error);
      res.status(500).json({ message: 'Error submitting report', error: error.message });
    }
  });

/* =========================================================================
   POST — 이벤트 종료 처리
   ========================================================================= */

router.post('/:id/end',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
      }

      event.isEnded = true;
      await event.save();

      res.json({ message: '이벤트가 종료되었습니다.' });
    } catch (error) {
      console.error('Error ending event:', error);
      res.status(500).json({ message: '이벤트 종료 처리 중 오류가 발생했습니다.' });
    }
  });

/* =========================================================================
   POST — 월간 번개주최 정산 및 생성 수동 실행 (관리자/운영진 전용)
   ========================================================================= */

const { runMonthlyLightningTask } = require('../../utils/lightningMonthlyService');

router.post('/lightning-monthly/trigger',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      await runMonthlyLightningTask();
      res.json({ message: '월간 번개주최 정산 및 신규 이벤트 생성이 성공적으로 완료되었습니다.' });
    } catch (error) {
      console.error('Error triggering monthly lightning task:', error);
      res.status(500).json({ message: '월간 번개주최 작업 처리 중 오류가 발생했습니다.', error: error.message });
    }
  });

module.exports = router;

// utils/eventAutoEnd.js
// 이벤트 행사 종료 시간 도달 시 자동 종료(isEnded: true) 및 확정 참가자 대상 리뷰 작성 유도 알림 발송

const Event = require('../models/Event');
const { createManyNotifications } = require('./notify');

async function checkAndAutoEndEvents() {
  try {
    const now = new Date();
    // 아직 종료 처리되지 않은(isEnded: false) 이벤트 조회
    const activeEvents = await Event.find({ isEnded: false });

    for (const event of activeEvents) {
      if (!event.date || !event.endTime) continue;

      const eventDate = new Date(event.date);
      const timeParts = String(event.endTime).split(':');
      const hours = parseInt(timeParts[0]) || 23;
      const minutes = parseInt(timeParts[1]) || 59;

      const endDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        hours,
        minutes,
        0,
        0
      );

      // 행사 종료 시각 경과 여부 확인
      if (now >= endDateTime) {
        event.isEnded = true;

        // 승인된 참가자 목록(approved)을 최종 참가자로 자동 확정
        const approvedParticipants = (event.appliedParticipants || [])
          .filter(p => p.status === 'approved')
          .map(p => (p.userId && p.userId._id) ? p.userId._id.toString() : p.userId.toString());

        event.finalParticipants = approvedParticipants;
        await event.save();

        console.log(`[이벤트 자동 종료] "${event.title}" (종료 시각: ${endDateTime.toLocaleString('ko-KR')}) 자동 종료 처리 완료 (최종 참가자 ${approvedParticipants.length}명)`);

        // 확정 참가자들에게 리뷰 작성 알림 일괄 발송
        if (approvedParticipants.length > 0) {
          const notifications = approvedParticipants.map(uid => ({
            userId: uid,
            type: 'event_review_prompt',
            title: `[${event.title}] 이벤트가 종료되었습니다. 후기를 남겨주세요! 🌟`,
            link: `/event-review.html?id=${event._id}`,
            meta: {
              eventId: event._id,
              eventTitle: event.title
            }
          }));
          await createManyNotifications(notifications);
        }
      }
    }
  } catch (error) {
    console.error('[checkAndAutoEndEvents] 오류:', error);
  }
}

module.exports = { checkAndAutoEndEvents };

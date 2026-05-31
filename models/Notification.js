// models/Notification.js
// 인앱 알림 — 수신자별 1문서.
// ---------------------------------------------------------------------
// Dual-TTL: 생성 시 expiresAt=now+30일, 읽음 처리 시 expiresAt=now+24시간(더 이른 시각)으로 갱신.
// 단일 TTL 인덱스 { expiresAt:1 }, { expireAfterSeconds:0 } 로 둘 다 처리 (RefreshToken.js 패턴).
// 주의: MongoDB TTL 스윕은 ~60초 주기라 "정확히 24h/30d"가 아니라 "그 직후"에 삭제됨(로그 UI라 무방).
// ---------------------------------------------------------------------

const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'participation_confirmed', // 참가 확정 (운영진 승인)
  'participation_rejected',  // 참가 반려
  'auto_confirmed',          // 자동 확정 (스케줄러)
  'confirmation_revoked',    // 참가자에게: 참가확정이 취소되어 대기로 전환
  'application_received',    // 운영진에게: 새 신청 도착
  'cancellation_requested',  // 운영진에게: 참가확정자가 취소 요청
  'cancellation_processed',  // 참가자에게: 취소 요청이 처리됨
  'warning_issued',          // 경고 부여 알림
  // 확장 여지(미구현): event_reminder, event_updated, announcement_posted, status_reset, application_cancelled
];

const TTL_AFTER_READ_MS = 24 * 60 * 60 * 1000;        // 24h
const TTL_AFTER_CREATE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:      { type: String, enum: NOTIFICATION_TYPES, required: true },
  title:     { type: String, required: true },
  body:      { type: String, default: '' },
  link:      { type: String, default: '/mypage.html' },
  meta: {
    eventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    eventTitle: { type: String },
    actorName:  { type: String },
    status:     { type: String },
  },
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// 단일 TTL 인덱스 (읽음 24h / 미읽음 30d 둘 다)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// 목록/뱃지 최적화
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
Notification.TYPES = NOTIFICATION_TYPES;
Notification.TTL_AFTER_READ_MS = TTL_AFTER_READ_MS;
Notification.TTL_AFTER_CREATE_MS = TTL_AFTER_CREATE_MS;

module.exports = Notification;

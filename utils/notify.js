// utils/notify.js
// 알림 생성 헬퍼 — 전부 try/catch 로 감싸 절대 throw 하지 않음.
// (상태변경/신청/경고 흐름이 알림 실패로 깨지면 안 됨)
// ---------------------------------------------------------------------

const Notification = require('../models/Notification');

/**
 * 알림 1건 생성. 실패 시 null 반환(throw 안 함).
 * @param {{userId, type, title, body?, link?, meta?}} p
 */
async function createNotification({ userId, type, title, body = '', link = '/mypage.html', meta = {} }) {
  try {
    if (!userId || !type || !title) return null;
    const expiresAt = new Date(Date.now() + Notification.TTL_AFTER_CREATE_MS); // +30d
    return await Notification.create({ recipient: userId, type, title, body, link, meta, expiresAt });
  } catch (err) {
    console.warn('[notify] 알림 생성 실패 (무시):', err.message);
    return null;
  }
}

/**
 * 다건 생성(벌크) — 자동확정 루프용. insertMany 1회.
 * @param {Array<{userId, type, title, body?, link?, meta?}>} items
 */
async function createManyNotifications(items = []) {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];
    const now = Date.now();
    const docs = items
      .filter((i) => i && i.userId && i.type && i.title)
      .map((i) => ({
        recipient: i.userId, type: i.type, title: i.title,
        body: i.body || '', link: i.link || '/mypage.html', meta: i.meta || {},
        expiresAt: new Date(now + Notification.TTL_AFTER_CREATE_MS),
      }));
    if (docs.length === 0) return [];
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.warn('[notify] 벌크 알림 생성 실패 (무시):', err.message);
    return [];
  }
}

module.exports = { createNotification, createManyNotifications };

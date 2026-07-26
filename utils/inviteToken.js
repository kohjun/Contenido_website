// utils/inviteToken.js
// 초대장 링크 보안을 위한 HMAC 서명 기반 암호화 토큰 생성/검증 유틸리티

const crypto = require('crypto');
const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'contenido_secure_invite_key_2026';

/**
 * 이벤트 ID와 초대한 부원 ID를 암호화 서명 토큰으로 생성
 */
function generateInviteToken(eventId, inviterUserId) {
  const payload = `${eventId}:${inviterUserId}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 12);
  const raw = `${payload}:${signature}`;
  return Buffer.from(raw).toString('base64url');
}

/**
 * 암호화 토큰 복호화 및 서명 검증
 */
function decodeInviteToken(token) {
  try {
    if (!token) return null;
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 3) return null;
    const [eventId, inviterUserId, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(`${eventId}:${inviterUserId}`).digest('hex').slice(0, 12);
    if (signature !== expectedSig) return null; // 변조된 토큰
    return { eventId, inviterUserId };
  } catch (e) {
    return null;
  }
}

module.exports = { generateInviteToken, decodeInviteToken };

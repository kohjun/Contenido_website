// models/RefreshToken.js
// 리프레시 토큰 회전 저장소 (MongoDB) — 로컬/카카오 공용.
// ---------------------------------------------------------------------
// - 평문 토큰은 클라이언트 쿠키에만, 서버엔 sha256 해시만 저장.
// - issue()가 평문을 반환(쿠키로 내려줌), 검증은 해시 비교.
// - 회전: refresh 시 기존 토큰 revoke + 신규 발급.
// - expiresAt TTL 인덱스로 만료분 자동 정리.
// ---------------------------------------------------------------------

const mongoose = require('mongoose');
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

const refreshTokenSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, index: true },  // sha256(평문)
  expiresAt: { type: Date, required: true },
  revoked:   { type: Boolean, default: false },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 만료 토큰 자동 삭제 (TTL)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** 신규 발급 — 평문 반환(쿠키용), 해시 저장. @returns {Promise<string>} 평문 토큰 */
refreshTokenSchema.statics.issue = async function (userId, days = 30, userAgent = null) {
  const token = crypto.randomBytes(48).toString('hex');
  await this.create({
    user: userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    userAgent,
  });
  return token;
};

/** 검증 — 유효하면 토큰 문서(.user 포함) 반환, 아니면 null */
refreshTokenSchema.statics.verifyToken = async function (token) {
  if (!token) return null;
  return this.findOne({
    tokenHash: hashToken(token),
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
};

/** 단일 토큰 폐기 */
refreshTokenSchema.statics.revokeToken = async function (token) {
  if (!token) return;
  await this.updateOne({ tokenHash: hashToken(token) }, { $set: { revoked: true } });
};

/** 유저의 모든 활성 토큰 폐기 (전체 로그아웃) */
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
  await this.updateMany({ user: userId, revoked: false }, { $set: { revoked: true } });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

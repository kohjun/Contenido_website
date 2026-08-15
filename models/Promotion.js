const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  imageUrl: { type: String, required: true },
  targetEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  linkUrl: { type: String, default: '' }, // 연동 이벤트가 없을 때 바로가기 커스텀 URL
  benefitDetail: { type: String, required: true }, // 혜택 상세 설명 (HTML/텍스트)
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Promotion', promotionSchema);

const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  imageUrl: { type: String, required: true },
  targetEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  benefitDetail: { type: String, required: true }, // 혜택 상세 설명 (HTML/텍스트)
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Promotion', promotionSchema);

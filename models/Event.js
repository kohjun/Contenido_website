// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  date: Date,
  place: String,
  participants: [String], // 총 참여 인원
  startTime: String,
  endTime: String,
  participation_fee: Number,
  contents: String,
  creator: mongoose.Schema.Types.ObjectId,
  isEnded: { type: Boolean, default: false },
  finalParticipants: { type: [String], default: [] }, // 참가자들의 ID 저장
});


module.exports = mongoose.model('Event', eventSchema);

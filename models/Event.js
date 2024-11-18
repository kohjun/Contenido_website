// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  date: Date,
  place: String,
  participants: [String], // (참여인원의 수)
  startTime: String,
  endTime: String,
  participation_fee: Number,
  contents: String,
  creator: mongoose.Schema.Types.ObjectId,
  isEnded: { type: Boolean, default: false }, // 종료 여부
  
});

module.exports = mongoose.model('Event', eventSchema);

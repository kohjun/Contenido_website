// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String, // 이벤트 제목
  date: Date, // 이벤트 날짜
  place: String, // 장소
  participantsLimit: Number, // 모집 인원
  appliedParticipants: [mongoose.Schema.Types.ObjectId], // 신청자 목록 (User ID 배열)
  finalParticipants: { type: [String], default: [] }, // 최종 참석자 목록 (String 배열)
  startTime: String, // 시작 시간
  endTime: String, // 종료 시간
  participation_fee: Number, // 참가비
  contents: String, // 이벤트 내용
  creator: mongoose.Schema.Types.ObjectId, // 이벤트 생성자 ID
  isEnded: { type: Boolean, default: false }, // 이벤트 종료 여부
  applicationDeadline: Date, // 모집 마감일
});


module.exports = mongoose.model('Event', eventSchema);

// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String, // 이벤트 제목
  date: Date, // 이벤트 날짜
  place: String, // 장소
  participants: Number, // 모집 인원 (최대 인원 수)
  appliedParticipants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 참조 추가
  ],// 신청자 목록 (User ID 배열)
  finalParticipants: { type: [String], default: [] }, // 최종 참석자 목록 (String 배열)
  startTime: String, // 시작 시간
  endTime: String, // 종료 시간
  participation_fee: Number, // 참가비
  contents: String, // 이벤트 내용
  creator: mongoose.Schema.Types.ObjectId, // 이벤트 생성자 (ObjectId)
  status: {
    type: String,
    enum: ['open', 'closed', 'completed'],
    default: 'open'
  },
  applicationPeriod: {
    start: Date,
    end: Date
  },
});


module.exports = mongoose.model('Event', eventSchema);

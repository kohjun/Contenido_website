// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // 필수 항목
  }, // 이벤트 제목
  date: {
    type: Date,
    required: true, // 필수 항목
  }, // 이벤트 날짜
  place: {
    type: String,
    required: true, // 필수 항목
  }, // 장소
  participants: {
    type: Number,
    required: true, // 필수 항목
  }, // 모집 인원 (최대 인원 수)
  appliedParticipants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 참조 추가
  ], // 신청자 목록 (User ID 배열)
  finalParticipants: {
    type: [String],
    default: [] // 최종 참석자 목록 (String 배열)
  },
  startTime: {
    type: String,
    required: true, // 필수 항목
  }, // 시작 시간
  endTime: {
    type: String,
    required: true, // 필수 항목
  }, // 종료 시간
  participation_fee: {
    type: Number,
    required: true, // 필수 항목
  }, // 참가비
  contents: {
    type: String,
    required: true, // 필수 항목
  }, // 이벤트 내용
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    
  }, // 이벤트 생성자 (ObjectId)
  isEnded: {
    type: Boolean,
    default: false, // 기본값 false (이벤트 종료 여부)
  },
  images: [{
    type: String,
    default: [] }],
  applicationPeriod: {
    start: Date,
    end: Date
  },
});


module.exports = mongoose.model('Event', eventSchema);

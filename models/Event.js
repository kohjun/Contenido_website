// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,                    // 이벤트 제목
  date: Date,                       // 이벤트 날짜
  place: String,                    // 장소
  participants: [String],           // 모집 인원 (최대 인원, ID 또는 이름 문자열 배열)
  appliedParticipants: [mongoose.Schema.Types.ObjectId], // 신청자 목록 (ObjectId 배열)
  finalParticipants: {              // 최종 참석자 목록
    type: [String],                 // String 배열로 저장
    default: []                     // 초기값은 빈 배열
  },
  startTime: String,                // 시작 시간
  endTime: String,                  // 종료 시간
  participation_fee: Number,        // 참가비
  contents: String,                 // 이벤트 내용
  creator: mongoose.Schema.Types.ObjectId, // 이벤트 생성자 (ObjectId)
  isEnded: {                        // 이벤트 종료 여부
    type: Boolean,
    default: false
  },
  applicationDeadline: Date,        // 모집 마감일
});



module.exports = mongoose.model('Event', eventSchema);

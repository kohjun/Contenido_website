// models/Event.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const participantSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

const eventSchema = new mongoose.Schema({
  team: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  place: {
    type: String,
    required: true,
  },
  participants: {
    type: Number,
    required: true,
  },
  appliedParticipants: [participantSchema],
  finalParticipants: {
    type: [String],
    default: []
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  participation_fee: {
    type: Number,
    required: true,
  },
  contents: {
    type: String,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  isEnded: {
    type: Boolean,
    default: false,
  },
  images: [{
    type: String,
    default: []
  }],
  rating: {
    type: Number,
    default: 0
  },
  accessCode: {
    type: String,
    required: true,
    maxlength: 60 // bcrypt 해시를 저장하기 위한 충분한 길이
  }
});

// 저장 전 accessCode 해시화
eventSchema.pre('save', async function(next) {
  if (this.isModified('accessCode')) {
    // 입력된 accessCode가 이미 해시된 값이 아닌 경우에만 해시화
    if (this.accessCode.length === 4) {
      this.accessCode = await bcrypt.hash(this.accessCode, 10);
    }
  }
  next();
});

// 접근 코드 확인 메서드
eventSchema.methods.verifyAccessCode = async function(inputCode) {
  return await bcrypt.compare(inputCode, this.accessCode);
};

module.exports = mongoose.model('Event', eventSchema);
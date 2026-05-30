// models/Event.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  }
});

const appliedParticipantSchema = new mongoose.Schema({
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
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  // 상태 변경 이력을 저장할 필드 추가
  statusHistory: [{
    previousStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      required: true
    },
    newStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changerName: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    isReset: {
      type: Boolean,
      default: false // 되돌리기 여부를 표시
    }
  }],
  // 선별적 이벤트용 답변
  answers: [{
    answerText: {
      type: String,
      required: true
    }
  }]
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
  appliedParticipants: [appliedParticipantSchema],
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
  refundPolicy: {
    type: String,
    enum: ['standard', 'custom', 'none'],
    default: 'standard'
  },
  refundCustomDescription: {
    type: String,
    required: function() {
      return this.refundPolicy === 'custom';
    }
  },
  rating: {
    type: Number,
    default: 0
  },
  accessCode: {
    type: String,
    required: true,
    maxlength: 60
  },
  isSelective: {
    type: Boolean,
    default: false
  },
  hasParticipantRules: {
    type: Boolean,
    default: true
  },
  additionalQuestions: [questionSchema],

  // ===== 태그 (운영진이 등록 시 카테고리별 단일 선택) =====
  // 카테고리: 분위기 / 장르 / 방식 / 장소
  // 예: ['신입추천', '여행', '팀전', '실내']
  tags: {
    type: [String],
    default: []
  },

  // ===== 신청/확정 기간 =====
  // null이면 미사용 — 신청은 즉시 가능
  applicationStartAt:     { type: Date, default: null },
  applicationDeadlineAt:  { type: Date, default: null },
  confirmationDeadlineAt: { type: Date, default: null },
  // 스케줄러가 자동 확정 수행 후 세팅 (중복 처리 방지)
  autoConfirmedAt:        { type: Date, default: null },

  // ===== 신청 한도 (정원과 분리) =====
  // null이면 participants 기준
  maxApplicants: {
    type: Number,
    default: null
  },

  // ===== 참가비 모드 =====
  // fixed: participation_fee 만 사용
  // range: participation_fee(= min) + participation_fee_max
  feeType: {
    type: String,
    enum: ['fixed', 'range'],
    default: 'fixed'
  },
  participation_fee_max: {
    type: Number,
    default: null
  }
});
eventSchema.pre('save', async function(next) {
  if (this.isModified('accessCode')) {
    if (this.accessCode.length === 4) {
      this.accessCode = await bcrypt.hash(this.accessCode, 10);
    }
  }
  next();
});

eventSchema.methods.verifyAccessCode = async function(inputCode) {
  return await bcrypt.compare(inputCode, this.accessCode);
};

module.exports = mongoose.model('Event', eventSchema);
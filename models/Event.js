// models/Event.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  }
});

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
  },
  // 답변 추가
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
  refundPolicy: {
    type: String,
    required: true
  },
  noshowPolicy: {
    type: String,
    required: true
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
  additionalQuestions: [questionSchema]
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
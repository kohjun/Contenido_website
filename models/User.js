// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  profileImage: { type: String },
  kakaoId: { type: String },
  isVerified: { type: Boolean, default: true },
  role: { 
    type: String, 
    enum: ['participant', 'starter', 'staff'], 
    default: 'participant' 
  }, // 역할 추가
  department: { 
    type: String, 
    enum: ['operations', 'promotion', 'planning'], 
    required: function () { return this.role === 'staff'; } 
  }, // 부서 (staff 전용)
  team: { 
    type: String, 
    required: function () { 
      return this.role === 'staff' && !this.isDepartmentHead; 
    } 
  }, // 팀 (staff이고 부장이 아닌 경우 필수)
  isDepartmentHead: { 
    type: Boolean, 
    default: false, 
    required: function () { return this.role === 'staff'; } 
  }, // 부장 여부
  status: {
    week1: { type: String, default: 'X' },
    week2: { type: String, default: 'X' },
    week3: { type: String, default: 'X' },
    week4: { type: String, default: 'X' }
  },
  active: { type: Boolean, default: true },
  name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  birthDate: { type: Date },
  isAdditionalInfoComplete: { type: Boolean, default: false },
  phonenumber: { type: String },
  createdEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // 생성한 이벤트
  participatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // 참가한 이벤트
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }] // 작성한 후기
});

// 커스텀 검증: staff 역할일 때 부서 및 조건 확인
userSchema.pre('save', function (next) {
  if (this.role === 'staff') {
    if (!this.department) {
      return next(new Error('부서가 없습니다다'));
    }
    if (!this.isDepartmentHead && !this.team) {
      return next(new Error('팀이 없습니다.'));
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);

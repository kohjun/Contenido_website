const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  school: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  wantOfficer: {
    type: Boolean,
    default: false
  },
  motivation: {
    type: String,
    required: true
  },
  planningContent: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  profileImage: { type: String },
  kakaoId: { type: String },
  isVerified: { type: Boolean, default: true },
  role: { 
    type: String, 
    enum: ['participant', 'starter', 'officer', 'guest', 'admin', 'applicant'],
    default: 'guest' 
  },
  department: { 
    type: String, 
    enum: ['operation', 'promotion', 'planning'], 
    required: function () { return this.role === 'officer'; } 
  },
  team: { 
    type: String, 
    required: function () { 
      return this.role === 'officer' && !this.isDepartmentHead; 
    } 
  },
  isDepartmentHead: { 
    type: Boolean, 
    default: false, 
    required: function () { return this.role === 'officer'; } 
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  participationCount: {
    totalCount: {
      type: Number,
      default: 0
    },
    regularCount: {
      type: Number,
      default: 0
    }
  },
  active: { type: Boolean, default: false },
  name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  birthDate: { type: Date },
  preferredActivity: { 
    type: String, 
    enum: [
      '강남구', '강동구', '강북구', '강서구', '관악구',
      '광진구', '구로구', '금천구', '노원구', '도봉구',
      '동대문구', '동작구', '마포구', '서대문구', '서초구',
      '성동구', '성북구', '송파구', '양천구', '영등포구',
      '용산구', '은평구', '종로구', '중구', '중랑구'
    ]
  },
  isAdditionalInfoComplete: { type: Boolean, default: false },
  phonenumber: { type: String },
  createdEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  participatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  application: applicationSchema
});

// 커스텀 검증: officer 역할일 때 부서 및 조건 확인
userSchema.pre('save', function (next) {
  if (this.role === 'officer') {
    if (!this.department) {
      return next(new Error('부서가 없습니다'));
    }
    if (!this.isDepartmentHead && !this.team) {
      return next(new Error('팀이 없습니다.'));
    }
  }
  next();
});

// 지원서 제출 메서드
userSchema.methods.submitApplication = async function(applicationData) {
  this.role = 'applicant';
  this.application = {
    status: 'pending',
    school: applicationData.school,
    address: applicationData.address,
    wantOfficer: applicationData.wantOfficer,
    motivation: applicationData.motivation,
    planningContent: applicationData.planningContent,
    appliedAt: new Date()
  };
  return this.save();
};

// 지원 상태 업데이트 메서드
userSchema.methods.updateApplicationStatus = async function(status) {
  if (!this.application) {
    throw new Error('지원서가 존재하지 않습니다');
  }
  
  this.application.status = status;
  this.application.processedAt = new Date();
  
  if (status === 'accepted') {
    this.role = this.application.wantOfficer ? 'starter' : 'participant';
    this.active = true;
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
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

// 경고 내역 스키마 추가
const warningHistorySchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true,
    trim: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issuedByName: {
    type: String,
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['정기모임', '스태프활동', '운영진활동', '번개활동', '조별활동', '기타'],
    default: '기타'
  },
  isActive: {
    type: Boolean,
    default: true // 경고 초기화 시 false로 변경
  },
  // 경고 삭제 관련 정보
  removedAt: {
    type: Date
  },
  removedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  removedByName: {
    type: String
  },
  removalReason: {
    type: String
  }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  // 운영진 업무 메모 필드 추가 (officer 역할일 때 사용)
  workMemo: {
    type: String,
    default: '',
    maxlength: 500,
    required: function() { return this.role === 'officer'; }
  },
  createdAt: { type: Date, default: Date.now }, // 회원가입 날짜 필드 추가
  displayName: { type: String, required: true },
  profileImage: { type: String },
  kakaoId: { type: String },
  isVerified: { type: Boolean, default: true },
  university:{type:String, required:false},
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
  isTeamLeader: {  // 새로운 필드 추가
    type: Boolean,
    default: false
  },
  // 경고 관련 필드들 확장
  warningCount: {
    type: Number,
    default: 0,
    min: 0
  },
  warningHistory: [warningHistorySchema], // 경고 내역 추가
  lastWarningResetDate: {
    type: Date,
    default: null
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
  application: applicationSchema,

  // staffTeam 세부 구분 필드 추가
  staffSubteam: {
    type: String,
    enum: ['A', 'B', 'C', 'D', ''],  // 빈 문자열 추가!
    default: '',
    required: false
  },
  // 카카오 인증 관련 필드 정리
  kakaoAccessToken: {
    type: String,
    select: false  // 기본 쿼리에서 제외
  },
  kakaoRefreshToken: {
    type: String,
    select: false
  },
  tokenExpiresAt: {
    type: Date,
    select: false
  },
  refreshTokenExpiresAt: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
});

// 토큰 갱신 메서드 최적화
userSchema.methods.updateTokens = async function(tokens) {
  const tokenExpiresIn = tokens.expires_in || 43199; // 12시간
  const refreshTokenExpiresIn = tokens.refresh_token_expires_in || 5184000; // 60일

  this.kakaoAccessToken = tokens.access_token;
  if (tokens.refresh_token) {
    this.kakaoRefreshToken = tokens.refresh_token;
    this.refreshTokenExpiresAt = new Date(Date.now() + (refreshTokenExpiresIn * 1000));
  }
  this.tokenExpiresAt = new Date(Date.now() + (tokenExpiresIn * 1000));
  this.lastLogin = new Date();
  
  return this.save();
};

// 토큰 유효성 검사 메서드
userSchema.methods.isTokenValid = function() {
  return this.tokenExpiresAt && this.tokenExpiresAt > new Date();
};

// 리프레시 토큰 유효성 검사 메서드
userSchema.methods.isRefreshTokenValid = function() {
  return this.refreshTokenExpiresAt && this.refreshTokenExpiresAt > new Date();
};

// 경고 부여 메서드 추가
userSchema.methods.issueWarning = function(warningData, issuedBy) {
  const warning = {
    reason: warningData.reason,
    category: warningData.category || '기타',
    issuedBy: issuedBy._id,
    issuedByName: issuedBy.name || issuedBy.displayName,
    issuedAt: new Date()
  };
  
  this.warningHistory.push(warning);
  this.warningCount += 1;
  
  return this.save();
};

// 경고 삭제(비활성화) 메서드 추가
userSchema.methods.removeWarning = function(warningId, removedBy, removalReason = '관리자 판단') {
  const warning = this.warningHistory.id(warningId);
  
  if (!warning) {
    throw new Error('해당 경고를 찾을 수 없습니다.');
  }
  
  if (!warning.isActive) {
    throw new Error('이미 삭제된 경고입니다.');
  }
  
  warning.isActive = false;
  warning.removedAt = new Date();
  warning.removedBy = removedBy._id;
  warning.removedByName = removedBy.name || removedBy.displayName;
  warning.removalReason = removalReason;
  
  this.warningCount = Math.max(0, this.warningCount - 1);
  
  return this.save();
};

// 활성 경고 개수 가져오기 메서드
userSchema.methods.getActiveWarningCount = function() {
  return this.warningHistory.filter(warning => warning.isActive).length;
};

// 경고 초기화 메서드 (스케줄러에서 사용)
userSchema.methods.resetWarnings = function() {
  // 활성 경고들을 비활성화
  this.warningHistory.forEach(warning => {
    if (warning.isActive) {
      warning.isActive = false;
      warning.removedAt = new Date();
      warning.removedByName = 'System';
      warning.removalReason = '정기 초기화';
    }
  });
  
  this.warningCount = 0;
  this.lastWarningResetDate = new Date();
  
  return this.save();
};

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

// 경고 횟수와 warningHistory의 일관성 확인 미들웨어
userSchema.pre('save', function (next) {
  if (this.isModified('warningHistory')) {
    const activeWarningCount = this.warningHistory.filter(warning => warning.isActive).length;
    this.warningCount = activeWarningCount;
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

// 리프레시 토큰 검증 메서드
userSchema.methods.verifyRefreshToken = function() {
  if (!this.refreshToken || !this.refreshTokenExpiry) {
    return false;
  }
  return new Date() < this.refreshTokenExpiry;
};

// 리프레시 토큰 업데이트 메서드
userSchema.methods.updateRefreshToken = async function(refreshToken) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14); // 14일 후 만료

  this.refreshToken = refreshToken;
  this.refreshTokenExpiry = expiry;
  this.lastRefreshTokenUse = new Date();
  
  return this.save();
};

// 토큰 무효화 메서드
userSchema.methods.invalidateTokens = async function() {
  this.refreshToken = null;
  this.refreshTokenExpiry = null;
  this.lastRefreshTokenUse = null;
  this.kakaoRefreshToken = null;
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);

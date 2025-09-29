// models/Team.js
const mongoose = require('mongoose');

const teamProgressSchema = new mongoose.Schema({
  missionId: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  currentCount: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  progress: [teamProgressSchema],
  bingoCount: {
    type: Number,
    default: 0
  },
  isRewardEligible: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정
teamSchema.index({ activityId: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ activityId: 1, members: 1 });

// 빙고 라인 계산 메서드
teamSchema.methods.calculateBingoCount = async function() {
  const Activity = require('./Activity');
  const activity = await Activity.findById(this.activityId);
  
  if (!activity) {
    console.warn(`Activity not found for team ${this.name}`);
    return 0;
  }
  
  // 3x3 그리드 생성
  const grid = Array(3).fill(null).map(() => Array(3).fill(false));
  
  // 완료된 미션들을 그리드에 표시
  this.progress.forEach(progress => {
    if (progress.completed) {
      const mission = activity.bingoMissions.find(m => m.id === progress.missionId);
      if (mission && mission.row >= 0 && mission.row < 3 && mission.col >= 0 && mission.col < 3) {
        grid[mission.row][mission.col] = true;
      }
    }
  });

  let bingoCount = 0;
  
  // 가로 라인 체크
  for (let row = 0; row < 3; row++) {
    if (grid[row][0] && grid[row][1] && grid[row][2]) {
      bingoCount++;
    }
  }
  
  // 세로 라인 체크
  for (let col = 0; col < 3; col++) {
    if (grid[0][col] && grid[1][col] && grid[2][col]) {
      bingoCount++;
    }
  }
  
  // 대각선 체크
  if (grid[0][0] && grid[1][1] && grid[2][2]) {
    bingoCount++;
  }
  if (grid[0][2] && grid[1][1] && grid[2][0]) {
    bingoCount++;
  }
  
  // 빙고 카운트 업데이트
  this.bingoCount = bingoCount;
  
  // 보상 대상 여부 확인
  const targetBingos = activity.targetBingos || 2;
  this.isRewardEligible = bingoCount >= targetBingos;
  
  await this.save();
  return bingoCount;
};

// 미션 완료 토글 메서드
teamSchema.methods.toggleMission = async function(missionId, userId) {
  const Activity = require('./Activity');
  const activity = await Activity.findById(this.activityId);
  
  if (!activity) {
    throw new Error('활동을 찾을 수 없습니다.');
  }
  
  const mission = activity.bingoMissions.find(m => m.id === missionId);
  if (!mission) {
    throw new Error('미션을 찾을 수 없습니다.');
  }
  
  let progress = this.progress.find(p => p.missionId === missionId);
  if (!progress) {
    progress = {
      missionId: missionId,
      completed: false,
      currentCount: 0
    };
    this.progress.push(progress);
  }
  
  progress.completed = !progress.completed;
  if (progress.completed) {
    progress.completedAt = new Date();
    progress.completedBy = userId;
    // 카운트형 미션의 경우 목표 수량으로 설정
    if (mission.type === 'count') {
      progress.currentCount = mission.targetCount || 1;
    }
  } else {
    progress.completedAt = null;
    progress.completedBy = null;
    if (mission.type === 'count') {
      progress.currentCount = 0;
    }
  }
  
  await this.save();
  await this.calculateBingoCount();
  
  return progress;
};

// 카운트 미션 조정 메서드
teamSchema.methods.adjustMissionCount = async function(missionId, increment, userId) {
  const Activity = require('./Activity');
  const activity = await Activity.findById(this.activityId);
  
  if (!activity) {
    throw new Error('활동을 찾을 수 없습니다.');
  }
  
  const mission = activity.bingoMissions.find(m => m.id === missionId);
  if (!mission || mission.type !== 'count') {
    throw new Error('카운트형 미션이 아닙니다.');
  }
  
  let progress = this.progress.find(p => p.missionId === missionId);
  if (!progress) {
    progress = {
      missionId: missionId,
      completed: false,
      currentCount: 0
    };
    this.progress.push(progress);
  }
  
  progress.currentCount = Math.max(0, progress.currentCount + increment);
  progress.completed = progress.currentCount >= (mission.targetCount || 1);
  
  if (progress.completed && !progress.completedAt) {
    progress.completedAt = new Date();
    progress.completedBy = userId;
  } else if (!progress.completed) {
    progress.completedAt = null;
    progress.completedBy = null;
  }
  
  await this.save();
  await this.calculateBingoCount();
  
  return progress;
};

// 팀 진행률 계산 메서드
teamSchema.methods.getProgressRate = function() {
  const totalMissions = 9; // 3x3 빙고
  const completedMissions = this.progress.filter(p => p.completed).length;
  return Math.round((completedMissions / totalMissions) * 100);
};

// 팀 상태 요약 메서드
teamSchema.methods.getSummary = async function() {
  await this.calculateBingoCount();
  
  return {
    name: this.name,
    memberCount: this.members.length,
    bingoCount: this.bingoCount,
    progressRate: this.getProgressRate(),
    isRewardEligible: this.isRewardEligible,
    completedMissions: this.progress.filter(p => p.completed).length
  };
};

// 미션 진행 상황 초기화 메서드
teamSchema.methods.initializeProgress = async function() {
  const Activity = require('./Activity');
  const activity = await Activity.findById(this.activityId);
  
  if (!activity) {
    throw new Error('활동을 찾을 수 없습니다.');
  }
  
  // 기존 진행상황 초기화
  this.progress = [];
  
  // 모든 미션에 대해 초기 진행상황 생성
  activity.bingoMissions.forEach(mission => {
    this.progress.push({
      missionId: mission.id,
      completed: false,
      currentCount: 0
    });
  });
  
  this.bingoCount = 0;
  this.isRewardEligible = false;
  
  await this.save();
};

// 가상 필드: 멤버 수
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// JSON 변환 시 가상 필드 포함
teamSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);
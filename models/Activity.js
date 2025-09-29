// models/Activity.js
const mongoose = require('mongoose');

const bingoMissionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: false,
    default: '' 
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['simple', 'count'],
    default: 'simple'
  },
  targetCount: {
    type: Number,
    default: 1
  },
  row: {
    type: Number,
    required: true,
    min: 0,
    max: 2
  },
  col: {
    type: Number,
    required: true,
    min: 0,
    max: 2
  }
});

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: '종료일은 시작일보다 뒤여야 합니다.'
    }
  },
  description: {
    type: String,
    default: ''
  },
  targetBingos: {
    type: Number,
    default: 2,
    min: 1,
    max: 8
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bingoMissions: [bingoMissionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  rewardProcessed: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정
activitySchema.index({ startDate: 1, endDate: 1 });
activitySchema.index({ participants: 1 });
activitySchema.index({ isActive: 1, isCompleted: 1 });

// 활동 종료 확인 및 완료 처리 메서드
activitySchema.methods.checkAndCompleteActivity = async function() {
  const now = new Date();
  if (now > this.endDate && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = now;
    await this.save();
    return true;
  }
  return false;
};

// 보상 처리 메서드
activitySchema.methods.processRewards = async function() {
  try {
    if (this.rewardProcessed) {
      throw new Error('이미 보상이 처리된 활동입니다.');
    }

    const Team = require('./Team');
    const User = require('./User');
    
    // 활동 완료 처리
    await this.checkAndCompleteActivity();
    
    // 해당 활동의 모든 팀 조회
    const teams = await Team.find({ activityId: this._id }).populate('members');
    
    const rewardResults = [];
    let totalRewardedUsers = 0;
    
    for (const team of teams) {
      // 각 팀의 빙고 개수 계산
      const bingoCount = await team.calculateBingoCount();
      
      // 목표 빙고 개수 이상 달성한 팀의 모든 멤버에게 보상
      if (bingoCount >= this.targetBingos) {
        const rewardedMembers = [];
        
        for (const member of team.members) {
          try {
            // regularCount 증가 (빙고 보상)
            member.participationCount.regularCount += 2;
            await member.save();
            rewardedMembers.push(member.name);
            totalRewardedUsers++;
          } catch (memberError) {
            console.error(`${member.name} 보상 처리 오류:`, memberError);
          }
        }
        
        rewardResults.push({
          teamName: team.name,
          bingoCount: bingoCount,
          rewardGiven: true,
          rewardedMembers: rewardedMembers
        });
      } else {
        rewardResults.push({
          teamName: team.name,
          bingoCount: bingoCount,
          rewardGiven: false,
          reason: `목표 미달성 (${bingoCount}/${this.targetBingos})`
        });
      }
    }
    
    // 보상 처리 완료 표시
    this.rewardProcessed = true;
    this.isCompleted = true;
    this.completedAt = new Date();
    await this.save();
    
    return {
      success: true,
      activityTitle: this.title,
      totalTeams: teams.length,
      totalRewardedUsers: totalRewardedUsers,
      rewardResults: rewardResults
    };
    
  } catch (error) {
    console.error('보상 처리 오류:', error);
    throw error;
  }
};

// 활동 상태 확인 메서드
activitySchema.methods.getStatus = function() {
  const now = new Date();
  
  if (!this.isActive) {
    return 'inactive';
  }
  
  if (now < this.startDate) {
    return 'upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    return 'ongoing';
  } else {
    return this.isCompleted ? 'completed' : 'ended';
  }
};

// 가상 필드: 활동 기간 (일 수)
activitySchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// JSON 변환 시 가상 필드 포함
activitySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Activity', activitySchema);
const mongoose = require('mongoose');

// 댓글 & 대댓글 서브스키마
const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  anonymousNumber: {
    type: Number,
    default: null // 0: 글쓴이, 1 이상: 익명 참여자 번호
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // 대댓글용 부모 댓글 ID
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isDeleted: {
    type: Boolean,
    default: false // 대댓글이 달린 댓글의 안전한 마스킹 삭제 처리
  }
}, { timestamps: true });

// 게시글 스키마
const communityPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  image: {
    type: String, // 업로드된 이미지 경로 (최대 1장)
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  
  // 익명 매핑 관리 (동일 게시글 내 고정 익명 번호 보장)
  anonymousMap: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    anonymousNumber: {
      type: Number
    }
  }],
  nextAnonymousNumber: {
    type: Number,
    default: 1
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', communityPostSchema);

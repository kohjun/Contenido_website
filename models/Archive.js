// models/Archive.js
const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({

  // ── 이벤트 연결 ──────────────────────────────────────────
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false
  },
  externalEvent: {
    type: Boolean,
    default: false
  },

  // ── ★ 총괄 스태프 (헤더 표시용) ─────────────────────────
  // 섹션 번호와 별개로 문서 최상단에 표시되는 총괄 책임자 이름
  headStaff: {
    type: String,
    default: ''
  },

  // ── 01 이벤트 요약 ────────────────────────────────────────
  projectSummary: {
    type: String,
    default: ''
  },

  // ── 02 이벤트 개요 ────────────────────────────────────────
  // 원본 이벤트의 스냅샷. 이벤트 삭제 이후에도 아카이브가 독립적으로 존재할 수 있도록 복사 저장.
  eventSnapshot: {
    title:             String,
    date:              Date,
    place:             String,
    team:              String,
    startTime:         String,
    endTime:           String,
    participation_fee: Number,
    contents:          String,
    images:            [String]
  },

  // ── 03 기획 의도 & 배경 ────────────────────────────────────
  // 자유 서술형 텍스트 (why/who/what 구분 없이 기획자가 직접 작성)
  background: {
    type: String,
    default: ''
  },

  // ── 04 이벤트 컨셉 & 세계관 ────────────────────────────────
  concept: {
    mainConcept:   String,
    conceptDetail: String,
    worldView:     String
  },

  // ── 05 콘텐츠 구조 ─────────────────────────────────────────
  structure: {
    format:   String,   // 진행 포맷 (팀 대항전 / 개인전 등)
    overview: String    // 전체 흐름 개요
  },

  // ── 06 게임 상세 설명 ──────────────────────────────────────
  games: [{
    name:     String,   // 게임 이름
    overview: String,   // 한 줄 개요
    rules:    String,   // 규칙
    points:   String,   // 포인트 / 특이사항
    scoring:  String    // 점수 방식
  }],

  // ── 07 타임라인 & 큐시트 ───────────────────────────────────
  timeline: [{
    time:    String,
    phase:   String,
    program: String,
    detail:  String,
    notes:   String
  }],

  // ── 08 예산 테이블 ─────────────────────────────────────────
  budget: {
    items: [{
      category: String,
      detail:   String,
      amount:   Number,
      ratio:    Number    // 비중 (%)
    }],
    total: { type: Number, default: 0 }
  },

  // ── 09 스태프 정보 ─────────────────────────────────────────
  // description 필드 추가: 담당 업무 한 줄 설명
  staff: [{
    name:        String,
    role:        String,
    description: String   // ← 신규 추가
  }],

  // ── 10 참가자 정보 ─────────────────────────────────────────
  participantInfo: {
    totalApplied: { type: Number, default: 0 },
    totalFinal:   { type: Number, default: 0 },
    male:         { type: Number, default: 0 },
    female:       { type: Number, default: 0 },
    ageRange:     String,
    location:     String,
    finalParticipants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // ── 11 OUTRO — 성과 & 배운 점 ──────────────────────────────
  reflection: {
    coreStrategies: [{
      title:       String,
      description: String
    }],
    challenges: [{
      risk:     String,
      solution: String
    }],
    learnings: [String],
    summary:   String
  },

  // 참가자 후기 스냅샷 (Event.endEvaluations에서 복사 저장)
  reviewSnapshot: {
    averageRating: { type: Number, default: 0 },
    totalReviews:  { type: Number, default: 0 },
    reviews: [{
      userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName:    String,
      rating:      Number,
      comment:     String,
      isAnonymous: Boolean,
      createdAt:   Date
    }]
  },

  // ── 12 미디어 자료 ─────────────────────────────────────────
  media: {
    images:     [String],
    videos:     [String],
    instagram:  String,
    youtube:    String,
    proposal:   String,     // 기획안 파일 URL
    archivePdf: String      // 생성된 아카이브 PDF URL
  },

  // ── 아카이브 메타 ──────────────────────────────────────────
  archived:   { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── 하위 호환용 레거시 필드 (삭제 금지, 읽기 전용) ───────────
  // 구버전 아카이브 데이터가 남아 있을 수 있으므로 스키마에서 제거하지 않음
  // UI에서는 더 이상 노출하지 않음
  solution: {
    differentiation: String,
    approach:        String,
    expectedEffect:  String
  },
  feedback: {
    improvements: String,
    regrets:      String
  },
  expectedOutcomes: {
    quantitative: [{ metric: String, target: String }],
    qualitative:  [String],
    highlights:   [String]
  },
  references: {
    benchmarking: [String],
    gameRules:    [String],
    budgetSource: String,
    spaceDesign:  String
  },
  appendix: {
    teamCompositions: [{
      teamName:    String,
      strategy:    String,
      members:     String,
      description: String
    }]
  },
  emergency: {
    contacts: [{ role: String, name: String, phone: String }],
    notes:    String
  }

}, { timestamps: true });

// ── 인덱스 ────────────────────────────────────────────────────
archiveSchema.index({ 'eventSnapshot.team': 1 });
archiveSchema.index({ 'eventSnapshot.date': -1 });
archiveSchema.index({ archived: 1 });
archiveSchema.index({ headStaff: 1 });   // 총괄 스태프별 조회용

module.exports = mongoose.model('Archive', archiveSchema);
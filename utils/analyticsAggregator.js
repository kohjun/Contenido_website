// utils/analyticsAggregator.js
// MongoDB aggregation pipeline 헬퍼들 — 운영팀 / 기획팀 페이지 정밀 통계 용

const User = require('../models/User');
const Event = require('../models/Event');
const Review = require('../models/Review');

/* ============================================================
   범위 계산 (range: 'all' | '3m' | '6m' | 'year')
   ============================================================ */
function getRangeStart(range) {
  const now = new Date();
  if (range === '3m') return new Date(now.getFullYear(), now.getMonth() - 3, 1);
  if (range === '6m') return new Date(now.getFullYear(), now.getMonth() - 6, 1);
  if (range === 'year') return new Date(now.getFullYear(), 0, 1);
  return null; // 'all'
}

/* ============================================================
   운영팀 페이지 종합 통계
   ============================================================ */
async function getOperationOverview() {
  // 1) 회원 기본 집계 + 분포 (역할/성별/연령)
  const usersBasic = await User.aggregate([
    { $match: { isVerified: true } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        activeCount: [
          { $match: { active: true } },
          { $count: 'count' }
        ],
        byRole: [
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ],
        byGender: [
          { $group: { _id: '$gender', count: { $sum: 1 } } }
        ],
        ages: [
          // birthDate가 실제 BSON Date 타입인 문서만 — 문자열/빈값 제외
          { $match: { birthDate: { $type: 'date' } } },
          {
            $project: {
              age: {
                $subtract: [
                  new Date().getFullYear(),
                  { $year: '$birthDate' }
                ]
              }
            }
          }
        ],
        activitySum: [
          {
            $group: {
              _id: null,
              total: { $sum: { $ifNull: ['$participationCount.regularCount', 0] } },
              count: { $sum: 1 }
            }
          }
        ],
        topRegions: [
          { $match: { preferredActivity: { $nin: [null, '', '-'] } } },
          { $group: { _id: '$preferredActivity', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 7 }
        ],
        activityHistogram: [
          {
            $project: {
              rc: { $ifNull: ['$participationCount.regularCount', 0] }
            }
          },
          {
            $bucket: {
              groupBy: '$rc',
              boundaries: [0, 1, 3, 6, 11, 999],
              default: 'other',
              output: { count: { $sum: 1 } }
            }
          }
        ]
      }
    }
  ]);

  const facet = usersBasic[0] || {};
  const total = (facet.total?.[0]?.count) || 0;
  const activeCount = (facet.activeCount?.[0]?.count) || 0;
  const inactive = total - activeCount;

  // 역할 분포
  const byRole = {};
  (facet.byRole || []).forEach(r => { byRole[r._id || 'unknown'] = r.count; });

  // 성별 분포
  const byGender = {};
  (facet.byGender || []).forEach(r => { byGender[r._id || 'unknown'] = r.count; });

  // 연령 분포 (5세 buckets)
  const ageBuckets = { '20세 미만': 0, '20-24세': 0, '25-29세': 0, '30-34세': 0, '35세 이상': 0 };
  let ageSum = 0; let ageCount = 0;
  (facet.ages || []).forEach(a => {
    const age = a.age;
    if (typeof age !== 'number' || age <= 0 || age > 100) return;
    ageSum += age; ageCount++;
    if (age < 20) ageBuckets['20세 미만']++;
    else if (age < 25) ageBuckets['20-24세']++;
    else if (age < 30) ageBuckets['25-29세']++;
    else if (age < 35) ageBuckets['30-34세']++;
    else ageBuckets['35세 이상']++;
  });
  const avgAge = ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : 0;

  // 평균 참여 (regularCount)
  const partTotal = facet.activitySum?.[0]?.total || 0;
  const partCount = facet.activitySum?.[0]?.count || 1;
  const avgParticipation = Math.round((partTotal / partCount) * 10) / 10;

  // 활동성 히스토그램 정리
  const activityRaw = facet.activityHistogram || [];
  const labelMap = { 0: '0회', 1: '1-2회', 3: '3-5회', 6: '6-10회', 11: '11+회' };
  const activityHistogram = [0, 1, 3, 6, 11].map(b => {
    const found = activityRaw.find(x => x._id === b);
    return { bucket: labelMap[b], count: found ? found.count : 0 };
  });

  // Top 7 지역
  const topRegions = (facet.topRegions || []).map(r => ({
    region: r._id, count: r.count
  }));

  // 2) 월별 가입 추이 — 전체 기간
  // createdAt이 실제 BSON Date 타입인 문서만 — 옛 데이터가 문자열로 남아있을 수 있음
  const signupAgg = await User.aggregate([
    { $match: { createdAt: { $type: 'date' } } },
    {
      $group: {
        _id: {
          y: { $year: '$createdAt' },
          m: { $month: '$createdAt' }
        },
        newCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ]);

  // 동아리 시작 시점부터 현재까지 모든 월을 채우고 누적값 계산
  const signupTrend = [];
  if (signupAgg.length) {
    const first = signupAgg[0]._id;
    const start = new Date(first.y, first.m - 1, 1);
    const end = new Date();
    end.setDate(1);
    const aggMap = new Map();
    signupAgg.forEach(r => {
      aggMap.set(`${r._id.y}-${r._id.m}`, r.newCount);
    });
    let cumulative = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const newCount = aggMap.get(`${y}-${m}`) || 0;
      cumulative += newCount;
      signupTrend.push({
        ym: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}년 ${m}월`,
        new: newCount,
        cumulative
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return {
    members: { total, active: activeCount, inactive, byRole, byGender, ageBuckets },
    avgAge,
    avgParticipation,
    signupTrend,
    activityHistogram,
    topRegions
  };
}

/* ============================================================
   기획팀 페이지 — 팀별 상세 통계
   ============================================================ */
async function getPlanningDetail(team, range) {
  const rangeStart = getRangeStart(range);
  const match = {
    team,
    isEnded: true
  };
  if (rangeStart) match.date = { $gte: rangeStart };

  const events = await Event.find(match).select(
    'title date startTime endTime participation_fee participants finalParticipants appliedParticipants tags rating'
  );

  if (!events.length) {
    return {
      summary: { totalEvents: 0, avgRating: 0, avgFee: 0, avgDuration: 0,
                 avgParticipationRate: 0, avgCapacity: 0, noShowRate: 0 },
      monthlyTrend: [], dayDist: Array(7).fill(0), hourDist: Array(24).fill(0),
      feeDistribution: [], topTags: [], recentEvents: []
    };
  }

  // 평점은 Review 컬렉션에서 별도 집계
  const eventIds = events.map(e => e._id);
  const reviews = await Review.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    { $group: { _id: '$eventId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const ratingMap = new Map();
  reviews.forEach(r => ratingMap.set(r._id.toString(), { avg: r.avg, count: r.count }));

  // 합산 통계
  let totalFee = 0, feeCount = 0;
  let totalDuration = 0, durCount = 0;
  let totalRate = 0, rateCount = 0;
  let totalCap = 0, capCount = 0;
  let totalApproved = 0, totalShown = 0, noshowEvents = 0;
  let ratingSum = 0, ratingTotalCount = 0;

  const dayDist = Array(7).fill(0);
  const hourDist = Array(24).fill(0);
  const monthlyMap = new Map();
  const feeBucketCounts = { '무료': 0, '1만원 미만': 0, '1-2만원': 0, '2-3만원': 0, '3만원 이상': 0 };
  const tagMap = new Map();

  const eventsForRecent = [];

  events.forEach(ev => {
    // 기본
    if (typeof ev.participation_fee === 'number') {
      totalFee += ev.participation_fee; feeCount++;
      const f = ev.participation_fee;
      if (f === 0) feeBucketCounts['무료']++;
      else if (f < 10000) feeBucketCounts['1만원 미만']++;
      else if (f < 20000) feeBucketCounts['1-2만원']++;
      else if (f < 30000) feeBucketCounts['2-3만원']++;
      else feeBucketCounts['3만원 이상']++;
    }
    if (ev.startTime && ev.endTime) {
      const s = new Date(`2000-01-01T${ev.startTime}`);
      const e = new Date(`2000-01-01T${ev.endTime}`);
      const mins = (e - s) / 60000;
      if (mins > 0 && mins < 1440) { totalDuration += mins; durCount++; }
    }
    const cap = ev.participants || 0;
    const finalLen = (ev.finalParticipants || []).length;
    if (cap > 0) {
      totalCap += cap; capCount++;
      totalRate += (finalLen / cap) * 100; rateCount++;
    }
    // no-show: approved vs final
    const approvedCount = (ev.appliedParticipants || []).filter(p => p.status === 'approved').length;
    if (approvedCount > 0 && finalLen > 0) {
      totalApproved += approvedCount;
      totalShown += finalLen;
      noshowEvents++;
    }

    // 요일/시간 — date가 유효한 Date 객체일 때만 집계
    if (ev.date) {
      const d = new Date(ev.date);
      if (!isNaN(d.getTime())) {
        dayDist[d.getDay()]++;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthEntry = monthlyMap.get(ym) || { eventCount: 0, ratingSum: 0, ratingCount: 0 };
        monthEntry.eventCount++;
        const r = ratingMap.get(ev._id.toString());
        if (r) {
          monthEntry.ratingSum += r.avg * r.count;
          monthEntry.ratingCount += r.count;
        }
        monthlyMap.set(ym, monthEntry);
      }
    }
    if (ev.startTime) {
      const hourMatch = ev.startTime.match(/^(\d{1,2})/);
      if (hourMatch) {
        const h = parseInt(hourMatch[1]);
        if (h >= 0 && h < 24) hourDist[h]++;
      }
    }

    // 태그
    (ev.tags || []).forEach(t => {
      tagMap.set(t, (tagMap.get(t) || 0) + 1);
    });

    // 평점 총합
    const r = ratingMap.get(ev._id.toString());
    if (r) {
      ratingSum += r.avg * r.count;
      ratingTotalCount += r.count;
    }

    // recent events 후보
    eventsForRecent.push({
      id: ev._id,
      title: ev.title,
      date: ev.date,
      rating: r ? Math.round(r.avg * 10) / 10 : null,
      participationRate: cap > 0 ? Math.round((finalLen / cap) * 100) : null,
      noShowCount: approvedCount - finalLen >= 0 ? (approvedCount - finalLen) : null,
      capacity: cap,
      finalCount: finalLen
    });
  });

  // monthlyTrend 정렬
  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, v]) => ({
      ym,
      label: ym.replace('-', '년 ') + '월',
      eventCount: v.eventCount,
      avgRating: v.ratingCount ? Math.round((v.ratingSum / v.ratingCount) * 10) / 10 : 0
    }));

  // 평점 평균
  const avgRating = ratingTotalCount ? Math.round((ratingSum / ratingTotalCount) * 10) / 10 : 0;
  const avgFee = feeCount ? Math.round(totalFee / feeCount) : 0;
  const avgDuration = durCount ? Math.round(totalDuration / durCount) : 0;
  const avgParticipationRate = rateCount ? Math.round(totalRate / rateCount) : 0;
  const avgCapacity = capCount ? Math.round(totalCap / capCount) : 0;
  const noShowRate = totalApproved > 0
    ? Math.max(0, Math.round(((totalApproved - totalShown) / totalApproved) * 100))
    : 0;

  // 태그 top 8
  const topTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // recent: 최신순 (유효한 date만)
  const recentEvents = eventsForRecent
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return !isNaN(d.getTime());
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return {
    summary: {
      totalEvents: events.length,
      avgRating, avgFee, avgDuration, avgParticipationRate, avgCapacity, noShowRate
    },
    monthlyTrend,
    dayDist,
    hourDist,
    feeDistribution: Object.entries(feeBucketCounts).map(([bucket, count]) => ({ bucket, count })),
    topTags,
    recentEvents
  };
}

/* ============================================================
   기획팀 페이지 — 팀 전체 비교 (A/B/C/D)
   ============================================================ */
async function getTeamComparison(range) {
  const teams = ['A', 'B', 'C', 'D'];
  const result = {};
  for (const t of teams) {
    const detail = await getPlanningDetail(t, range);
    result[t] = detail.summary;
  }
  return result;
}

module.exports = {
  getOperationOverview,
  getPlanningDetail,
  getTeamComparison
};

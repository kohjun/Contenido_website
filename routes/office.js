const express = require('express');
const router = express.Router();
const path = require('path');
const Event = require('../models/Event');
const Organization = require('../models/organization');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const authenticateToken = require('../middleware/authMiddleware'); // 추가
const {
  getOperationOverview,
  getPlanningDetail,
  getTeamComparison
} = require('../utils/analyticsAggregator');

// 조직도 데이터 API
router.get('/organization', authorizeRoles('officer', 'admin'), async (req, res) => {
    try {
        const orgData = await Organization.findOne().sort({ createdAt: -1 });
        res.json(orgData || { teamData: [] });
    } catch (error) {
        console.error('조직도 데이터 조회 오류:', error);
        res.status(500).json({ error: '데이터 조회 실패' });
    }
});

// 운영진 메인 페이지
router.get('/', authorizeRoles('officer', 'admin'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/office.html'));
});

router.post('/organization', authorizeRoles('officer', 'admin'), async (req, res) => {
    try {
        const newOrgData = new Organization(req.body);
        await newOrgData.save();
        res.json({ success: true });
    } catch (error) {
        console.error('조직도 데이터 저장 오류:', error);
        res.status(500).json({ error: '데이터 저장 실패' });
    }
});

// 팀별 통계 API - 인증 및 권한 미들웨어 사용
router.get('/team-statistics', 
    authenticateToken, 
    authorizeRoles('officer', 'admin'),
    async (req, res) => {
    try {
        const teams = ['A', 'B', 'C', 'D'];
        const Review = require('../models/Review');
        const statistics = {};

        // 기본 통계 객체 생성 함수
        const createDefaultStats = () => ({
            averageRating: 0,
            averageFee: 0,
            averageDuration: 0,
            participationRate: 0,
            eventsByDay: Array(7).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
            eventsByHour: Array(24).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
            eventsByMonth: Array(12).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
            totalEvents: 0
        });

        // 각 팀에 대한 기본 통계 초기화
        teams.forEach(team => {
            statistics[team] = createDefaultStats();
        });

        for (const team of teams) {
            try {
                const teamEvents = await Event.find({ 
                    team: team,
                    isEnded: true 
                });

                if (teamEvents.length === 0) {
                    statistics[team] = createDefaultStats();
                    continue;
                }

                // 이벤트 통계 계산
                let totalRating = 0;
                let reviewCount = 0;

                for (const event of teamEvents) {
                    const reviews = await Review.find({ eventId: event._id });
                    if (reviews.length > 0) {
                        totalRating += reviews.reduce((sum, review) => sum + review.rating, 0);
                        reviewCount += reviews.length;
                    }
                }

                const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

                // 나머지 통계 계산
                const eventTimes = teamEvents.map(event => ({
                    duration: event.endTime && event.startTime ? 
                        (new Date(`2000-01-01T${event.endTime}`) - new Date(`2000-01-01T${event.startTime}`)) / (1000 * 60) : 0,
                    day: new Date(event.date).getDay(),
                    hour: event.startTime ? new Date(`2000-01-01T${event.startTime}`).getHours() : 0,
                    month: new Date(event.date).getMonth()
                }));

                statistics[team] = {
                    averageRating: Math.round(averageRating * 10) / 10,
                    averageFee: Math.round(teamEvents.reduce((sum, event) => sum + (event.participation_fee || 0), 0) / teamEvents.length),
                    averageDuration: Math.round(eventTimes.reduce((sum, { duration }) => sum + duration, 0) / eventTimes.length),
                    participationRate: Math.round(teamEvents.reduce((sum, event) => 
                        sum + ((event.finalParticipants?.length || 0) / (event.participants || 1) * 100), 0) / teamEvents.length),
                    eventsByDay: eventTimes.reduce((acc, { day }) => {
                        acc[day] = (acc[day] || 0) + 1;
                        return acc;
                    }, {}),
                    eventsByHour: eventTimes.reduce((acc, { hour }) => {
                        acc[hour] = (acc[hour] || 0) + 1;
                        return acc;
                    }, {}),
                    eventsByMonth: eventTimes.reduce((acc, { month }) => {
                        acc[month] = (acc[month] || 0) + 1;
                        return acc;
                    }, {}),
                    totalEvents: teamEvents.length
                };
            } catch (error) {
                console.error(`Error processing team ${team}:`, error);
                statistics[team] = createDefaultStats();
            }
        }

        res.json(statistics);
    } catch (error) {
        console.error('Error fetching team statistics:', error);
        res.status(500).json({
            message: '팀 통계 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/* ============================================================
   신규 — 운영팀 페이지 종합 통계 (월별 가입 전체 기간 + 분포)
   ============================================================ */
router.get('/analytics/operation-overview',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const data = await getOperationOverview();
      res.json(data);
    } catch (error) {
      console.error('Error in operation-overview:', error);
      res.status(500).json({ message: '운영팀 통계 조회 중 오류', error: error.message });
    }
  });

/* ============================================================
   신규 — 기획팀 팀별 상세 통계
   query: team=A|B|C|D, range=all|3m|6m|year
   ============================================================ */
router.get('/analytics/planning-detail',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const team = req.query.team || 'A';
      const range = req.query.range || 'all';
      if (!['A', 'B', 'C', 'D'].includes(team)) {
        return res.status(400).json({ message: '유효하지 않은 팀입니다.' });
      }
      const data = await getPlanningDetail(team, range);
      res.json(data);
    } catch (error) {
      console.error('Error in planning-detail:', error);
      res.status(500).json({ message: '기획팀 상세 통계 조회 중 오류', error: error.message });
    }
  });

/* ============================================================
   신규 — 기획팀 4팀 비교
   query: range=all|3m|6m|year
   ============================================================ */
router.get('/analytics/team-comparison',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const range = req.query.range || 'all';
      const data = await getTeamComparison(range);
      res.json(data);
    } catch (error) {
      console.error('Error in team-comparison:', error);
      res.status(500).json({ message: '팀 비교 통계 조회 중 오류', error: error.message });
    }
  });

module.exports = router;

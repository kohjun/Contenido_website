const express = require('express');
const router = express.Router();
const path = require('path');
const Organization = require('../models/organization');
const { authorizeRoles } = require('../middleware/roleMiddleware');

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

module.exports = router;

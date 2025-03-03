const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/result', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('application');
        
        if (!user || !user.application) {
            return res.status(404).json({ 
                error: '제출된 지원서를 찾을 수 없습니다.' 
            });
        }

        const status = user.application.status.toUpperCase();
        
        const response = {
            status: status,
            appliedAt: user.application.appliedAt,
            processedAt: user.application.processedAt
        };

        if (status === 'ACCEPTED') {
            response.kakaoUrl = process.env.KAKAO_CHAT_URL;
        }

        return res.json(response);

    } catch (error) {
        console.error('Application result error:', error);
        return res.status(500).json({ 
            error: '결과 확인 중 오류가 발생했습니다.' 
        });
    }
});

module.exports = router;

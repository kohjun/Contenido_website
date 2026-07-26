const express = require('express');
const router = express.Router();
const RegularChecklist = require('../models/RegularChecklist');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// 1) 정기모임 체크리스트 상태 조회
router.get('/checklist', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const doc = await RegularChecklist.findOne().sort({ updatedAt: -1 }).lean();
    res.json({
      checkedItems: doc ? doc.checkedItems : []
    });
  } catch (error) {
    console.error('Error fetching regular checklist:', error);
    res.status(500).json({ message: '체크리스트 조회 중 오류가 발생했습니다.' });
  }
});

// 2) 정기모임 체크리스트 상태 저장
router.post('/checklist', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const { checkedItems } = req.body;
    const items = Array.isArray(checkedItems) ? checkedItems : [];

    let doc = await RegularChecklist.findOne();
    if (!doc) {
      doc = new RegularChecklist({
        checkedItems: items,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });
    } else {
      doc.checkedItems = items;
      doc.updatedBy = req.user.id;
      doc.updatedAt = new Date();
    }
    await doc.save();

    res.json({
      message: '체크리스트가 성공적으로 저장되었습니다.',
      checkedItems: doc.checkedItems
    });
  } catch (error) {
    console.error('Error saving regular checklist:', error);
    res.status(500).json({ message: '체크리스트 저장 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

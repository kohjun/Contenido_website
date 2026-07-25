// routes/staff.js
const express = require('express');
const router = express.Router();
const StaffChecklist = require('../models/StaffChecklist');
const StarterStaff = require('../models/StarterStaff');
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// 1) 체크리스트 상태 조회
router.get('/checklist', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const doc = await StaffChecklist.findOne().sort({ updatedAt: -1 }).lean();
    res.json({
      checkedItems: doc ? doc.checkedItems : []
    });
  } catch (error) {
    console.error('Error fetching staff checklist:', error);
    res.status(500).json({ message: '체크리스트 조회 중 오류가 발생했습니다.' });
  }
});

// 2) 체크리스트 상태 저장
router.post('/checklist', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const { checkedItems } = req.body;
    const items = Array.isArray(checkedItems) ? checkedItems : [];

    let doc = await StaffChecklist.findOne();
    if (!doc) {
      doc = new StaffChecklist({
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
    console.error('Error saving staff checklist:', error);
    res.status(500).json({ message: '체크리스트 저장 중 오류가 발생했습니다.' });
  }
});

// 3) 스타터-스태프 명단 조회
router.get('/starter-staff', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const doc = await StarterStaff.findOne()
      .populate('memberIds', 'name displayName role team department university phonenumber')
      .lean();

    res.json({
      memberIds: doc ? doc.memberIds.map(m => m._id) : [],
      members: doc ? doc.memberIds : []
    });
  } catch (error) {
    console.error('Error fetching starter staff:', error);
    res.status(500).json({ message: '스타터-스태프 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 4) 스타터-스태프 명단 저장
router.post('/starter-staff', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const { memberIds } = req.body;
    const ids = Array.isArray(memberIds) ? memberIds : [];

    let doc = await StarterStaff.findOne();
    if (!doc) {
      doc = new StarterStaff({
        memberIds: ids,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });
    } else {
      doc.memberIds = ids;
      doc.updatedBy = req.user.id;
      doc.updatedAt = new Date();
    }
    await doc.save();

    res.json({
      message: `스타터-스태프 명단 ${ids.length}명이 확정되었습니다. (매번 의무신청 경고 면제)`,
      starterStaff: doc
    });
  } catch (error) {
    console.error('Error saving starter staff:', error);
    res.status(500).json({ message: '스타터-스태프 명단 저장 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

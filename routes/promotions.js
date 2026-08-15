const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const Event = require('../models/Event');
const Supporter = require('../models/Supporter');
const User = require('../models/User');
const { upload, handleMulterError, processAndSaveImages } = require('./events/_multer');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ── 서포터즈 명단 조회 (운영진용) ──
router.get('/supporters', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const doc = await Supporter.findOne({ year, month })
      .populate('memberIds', 'name displayName role team department university phonenumber')
      .lean();

    res.json({
      year,
      month,
      memberIds: doc ? doc.memberIds.map(m => m._id) : [],
      members: doc ? doc.memberIds : []
    });
  } catch (error) {
    console.error('Error fetching supporters:', error);
    res.status(500).json({ message: '서포터즈 목록 조회 중 오류가 발생했습니다.' });
  }
});

// ── 서포터즈 명단 저장/확정 (운영진용) ──
router.post('/supporters', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const { year, month, memberIds } = req.body;
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(month);

    if (!parsedYear || !parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({ message: '유효한 연도와 월을 입력해 주세요.' });
    }

    const ids = Array.isArray(memberIds) ? memberIds : [];

    const supporterDoc = await Supporter.findOneAndUpdate(
      { year: parsedYear, month: parsedMonth },
      {
        memberIds: ids,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      message: `${parsedYear}년 ${parsedMonth}월 서포터즈 명단 ${ids.length}명이 확정되었습니다.`,
      supporter: supporterDoc
    });
  } catch (error) {
    console.error('Error saving supporters:', error);
    res.status(500).json({ message: '서포터즈 명단 저장 중 오류가 발생했습니다.' });
  }
});

// 1) GET /active - 현재 활성화된 홍보 조회 (모든 사용자)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const activePromos = await Promotion.find({
      isActive: true,
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    })
    .sort({ createdAt: -1 })
    .populate('targetEventId')
    .lean();

    res.json(activePromos);
  } catch (error) {
    console.error('Error fetching active promotion:', error);
    res.status(500).json({ message: '활성화된 홍보 조회 중 오류가 발생했습니다.' });
  }
});

// 2) GET /detail/:id - 특정 홍보 상세 조회 (모든 사용자 - 혜택페이지 용)
router.get('/detail/:id', async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id).populate('targetEventId').lean();
    if (!promo) {
      return res.status(404).json({ message: '홍보 정보를 찾을 수 없습니다.' });
    }
    res.json(promo);
  } catch (error) {
    console.error('Error fetching promotion detail:', error);
    res.status(500).json({ message: '홍보 상세 조회 중 오류가 발생했습니다.' });
  }
});

// 3) GET / - 모든 홍보 목록 조회 (운영진용)
router.get('/', authenticateToken, authorizeRoles('officer', 'admin'), async (req, res) => {
  try {
    const list = await Promotion.find().sort({ createdAt: -1 }).populate('targetEventId').lean();
    res.json(list);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ message: '홍보 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 4) POST / - 홍보 생성 (운영진용)
router.post('/',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  upload.array('photo', 1),
  handleMulterError,
  async (req, res) => {
    try {
      const { title, startDate, endDate, targetEventId, linkUrl, benefitDetail, isActive } = req.body;
      
      const savedImages = req.files ? await processAndSaveImages(req.files) : [];
      if (savedImages.length === 0) {
        return res.status(400).json({ message: '썸네일 이미지를 올려주세요.' });
      }

      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);

      const newPromo = await Promotion.create({
        title,
        startDate: sDate,
        endDate: eDate,
        imageUrl: savedImages[0],
        targetEventId: targetEventId && targetEventId !== 'null' ? targetEventId : null,
        linkUrl: linkUrl ? linkUrl.trim() : '',
        benefitDetail,
        isActive: isActive === 'true' || isActive === true
      });

      res.status(201).json({ message: '홍보가 성공적으로 생성되었습니다.', promotion: newPromo });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({ message: '홍보 생성 중 오류가 발생했습니다.', error: error.message });
    }
  }
);

// 5) PUT /:id - 홍보 수정 (운영진용)
router.put('/:id',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  upload.array('photo', 1),
  handleMulterError,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, startDate, endDate, targetEventId, linkUrl, benefitDetail, isActive } = req.body;
      
      const promo = await Promotion.findById(id);
      if (!promo) {
        return res.status(404).json({ message: '수정할 홍보를 찾을 수 없습니다.' });
      }

      // 새 이미지 업로드 처리
      const savedImages = req.files ? await processAndSaveImages(req.files) : [];
      if (savedImages.length > 0) {
        promo.imageUrl = savedImages[0];
      }

      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);

      promo.title = title;
      promo.startDate = sDate;
      promo.endDate = eDate;
      promo.targetEventId = targetEventId && targetEventId !== 'null' ? targetEventId : null;
      promo.linkUrl = linkUrl ? linkUrl.trim() : '';
      promo.benefitDetail = benefitDetail;
      promo.isActive = isActive === 'true' || isActive === true;

      await promo.save();
      res.json({ message: '홍보가 성공적으로 수정되었습니다.', promotion: promo });
    } catch (error) {
      try {
        process.stderr.write(`[ROUTER PUT ERROR] [${new Date().toISOString()}] ${error.stack || error}\n`);
      } catch (e) {}
      console.error('Error updating promotion:', error);
      res.status(500).json({ message: '홍보 수정 중 오류가 발생했습니다.', error: error.message });
    }
  }
);

// 6) DELETE /:id - 홍보 삭제 (운영진용)
router.delete('/:id',
  authenticateToken,
  authorizeRoles('officer', 'admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const promo = await Promotion.findByIdAndDelete(id);
      if (!promo) {
        return res.status(404).json({ message: '삭제할 홍보를 찾을 수 없습니다.' });
      }
      res.json({ message: '홍보가 삭제되었습니다.' });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      res.status(500).json({ message: '홍보 삭제 중 오류가 발생했습니다.' });
    }
  }
);

module.exports = router;

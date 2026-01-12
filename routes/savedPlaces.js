const express = require('express');
const router = express.Router();
const SavedPlace = require('../models/SavedPlace');
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== 이미지 업로드 설정 ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/partnerships';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'partnership-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// ========== 권한 체크 미들웨어 ==========
const checkPartnershipPermission = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // admin이거나 cooperationTeam인 경우만 허용
    if (user.role === 'admin' || user.team === 'cooperationTeam') {
      return next();
    }

    return res.status(403).json({ 
      message: '제휴 관리 권한이 없습니다. (대외협력팀 또는 관리자만 가능)' 
    });
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// ========== 모든 저장된 장소 조회 ==========
router.get('/', authenticateToken, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const places = await SavedPlace.find().sort('-createdAt');
    res.json(places);
  } catch (error) {
    console.error('Error fetching saved places:', error);
    res.status(500).json({ 
      message: '저장된 장소를 불러오는 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// ========== 현재 사용자 권한 확인 API ==========
router.get('/check-permission', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const hasPermission = user.role === 'admin' || user.team === 'cooperationTeam';
    
    res.json({ 
      hasPermission,
      role: user.role,
      team: user.team 
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ message: '권한 확인 중 오류가 발생했습니다.' });
  }
});

// ========== 새로운 장소 저장 (권한 필요) ==========
router.post('/', authenticateToken, checkPartnershipPermission, upload.single('image'), async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const {
      placeId,
      placeName,
      addressName,
      roadAddressName,
      phoneNumber,
      category,
      longitude,
      latitude,
      capacity,
      facilities,
      memo,
      discountRate,
      partnershipDate
    } = req.body;

    // 필수 필드 검증
    if (!placeId || !placeName || !addressName || !longitude || !latitude || !capacity) {
      return res.status(400).json({ 
        message: '필수 정보가 누락되었습니다.' 
      });
    }

    // 이미지 URL 처리
    let imageUrl = '/images/placeholder.png';
    if (req.file) {
      imageUrl = `/uploads/partnerships/${req.file.filename}`;
    }

    const savedPlace = new SavedPlace({
      placeId,
      placeName,
      addressName,
      roadAddressName,
      phoneNumber,
      category,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      capacity,
      facilities: Array.isArray(facilities) ? facilities : JSON.parse(facilities || '[]'),
      memo,
      discountRate: discountRate || '',
      partnershipDate: partnershipDate || new Date(),
      imageUrl,
      creator: req.user.id
    });

    await savedPlace.save();
    res.status(201).json({ 
      message: '장소가 저장되었습니다.',
      place: savedPlace 
    });
  } catch (error) {
    console.error('Error saving place:', error);
    res.status(500).json({ 
      message: '장소 저장 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// ========== 장소 삭제 (권한 필요) ==========
router.delete('/:id', authenticateToken, checkPartnershipPermission, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const place = await SavedPlace.findById(req.params.id);
    if (!place) {
      return res.status(404).json({ 
        message: '장소를 찾을 수 없습니다.' 
      });
    }

    // 이미지 파일 삭제
    if (place.imageUrl && place.imageUrl !== '/images/placeholder.png') {
      const imagePath = path.join(__dirname, '../public', place.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await place.deleteOne();
    res.json({ message: '장소가 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ 
      message: '장소 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// ========== 특정 장소 정보 조회 ==========
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const place = await SavedPlace.findById(req.params.id);
    if (!place) {
      return res.status(404).json({ 
        message: '장소를 찾을 수 없습니다.' 
      });
    }
    res.json(place);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ 
      message: '장소 정보를 불러오는 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

module.exports = router;
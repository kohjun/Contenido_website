const express = require('express');
const router = express.Router();
const SavedPlace = require('../models/SavedPlace');
const authenticateToken = require('../middleware/authMiddleware');

// 모든 저장된 장소 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Content-Type 헤더 명시적 설정
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



// 새로운 장소 저장
router.post('/', authenticateToken, async (req, res) => {
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
    } = req.body;

    // 필수 필드 검증
    if (!placeId || !placeName || !addressName || !longitude || !latitude|| !capacity || !facilities) {
      return res.status(400).json({ 
        message: '필수 정보가 누락되었습니다.' 
      });
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
        coordinates: [longitude, latitude]
      },
      capacity,
      facilities,
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


// 메모 업데이트 라우트 추가
router.put('/:id/memo', async (req, res) => {
  try {
      const { memo } = req.body;
      const place = await SavedPlace.findById(req.params.id);
      
      if (!place) {
          return res.status(404).json({ message: '장소를 찾을 수 없습니다.' });
      }

      place.memo = memo;
      await place.save();

      res.json({ message: '메모가 업데이트되었습니다.' });
  } catch (error) {
      console.error('Error updating memo:', error);
      res.status(500).json({ message: '메모 업데이트 중 오류가 발생했습니다.' });
  }
});
// 장소 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const place = await SavedPlace.findById(req.params.id);
    if (!place) {
      return res.status(404).json({ 
        message: '장소를 찾을 수 없습니다.' 
      });
    }

    // 삭제 권한 확인 (생성자만 삭제 가능)
    if (place.creator && place.creator.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: '이 장소를 삭제할 권한이 없습니다.' 
      });
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

// 특정 장소 정보 조회
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
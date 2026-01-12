const mongoose = require('mongoose');

const savedPlaceSchema = new mongoose.Schema({
  placeId: { 
    type: String, 
    required: true 
  },
  placeName: { 
    type: String, 
    required: true 
  },
  addressName: { 
    type: String, 
    required: true 
  },
  roadAddressName: String,
  phoneNumber: String,
  category: String,
  memo: {
    type: String,
    default: ''
  },
  // ========== 새로 추가 ==========
  discountRate: {
    type: String,  // "10%", "20%" 등
    default: ''
  },
  partnershipDate: {
    type: Date,
    default: Date.now
  },
  imageUrl: {
    type: String,
    default: '/images/placeholder.png'
  },
  // ========== 기존 필드 ==========
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  capacity: {
    type: String,
    enum: ['~10', '~30', '~50','~100'],
    required: true
  },
  facilities: [{
    type: String,
    enum: [
      'TV/프로젝터',
      '인터넷/WIFI',
      '복사/인쇄기',
      '화이트보드',
      '음향/마이크',
      '취사시설',
      '음식물반입가능',
      '주차',
      'PC/노트북',
      '의자/테이블',
      '콘센트',
      '24시 운영',
      '연중무휴',
      '간단한 다과/음료',
      '내부화장실',
      '마트/편의점',
      '남/여화장실 구분'
    ]
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

savedPlaceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SavedPlace', savedPlaceSchema);
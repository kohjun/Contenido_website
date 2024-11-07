// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  profileImage: { type: String },
  kakaoId: { type: String },
  isVerified: { type: Boolean, default: true },
  role: { type: String, enum: ['participant', 'staff'], default: 'participant' },
  status: {
    week1: { type: String, default: 'X' },
    week2: { type: String, default: 'X' },
    week3: { type: String, default: 'X' },
    week4: { type: String, default: 'X' }
  },
  name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  birthDate: { type: Date },
  isAdditionalInfoComplete: { type: Boolean, default: false },
  phonenumber: { type: String }, // 전화번호 필드 추가
});

module.exports = mongoose.model('User', userSchema);

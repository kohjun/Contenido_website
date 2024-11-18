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
  phonenumber: { type: String },
  createdEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // 생성한 이벤트
  participatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // 참가한 이벤트
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }] // 작성한 후기
});


module.exports = mongoose.model('User', userSchema);

// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  kakaoId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: true },
  role: { type: String, enum: ['participant', 'staff'], default: 'participant' } // Role field
});

module.exports = mongoose.model('User', userSchema);

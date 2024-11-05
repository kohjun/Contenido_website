// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Email is the unique identifier
  displayName: { type: String, required: true },
  profileImage: { type: String },
  kakaoId: { type: String }, // Optional; no longer unique
  isVerified: { type: Boolean, default: true },
  role: { type: String, enum: ['participant', 'staff'], default: 'participant' }
});

module.exports = mongoose.model('User', userSchema);
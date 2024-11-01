// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  kakaoId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true }, // profile_nickname
  profileImage: { type: String },                 // profile_image
  isVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);

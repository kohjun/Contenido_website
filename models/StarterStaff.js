// models/StarterStaff.js
const mongoose = require('mongoose');

const starterStaffSchema = new mongoose.Schema({
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StarterStaff', starterStaffSchema);

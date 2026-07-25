// models/StaffChecklist.js
const mongoose = require('mongoose');

const staffChecklistSchema = new mongoose.Schema({
  checkedItems: [{
    type: String
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

module.exports = mongoose.model('StaffChecklist', staffChecklistSchema);

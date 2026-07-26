const mongoose = require('mongoose');

const regularChecklistSchema = new mongoose.Schema({
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
}, {
  timestamps: true
});

module.exports = mongoose.model('RegularChecklist', regularChecklistSchema);

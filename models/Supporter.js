// models/Supporter.js
const mongoose = require('mongoose');

const supporterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
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

supporterSchema.index({ year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Supporter', supporterSchema);

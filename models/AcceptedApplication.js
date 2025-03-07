const mongoose = require('mongoose');

const acceptedApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicationData: {
    school: String,
    address: String,
    wantOfficer: Boolean,
    motivation: String,
    planningContent: String,
    appliedAt: Date,
    processedAt: Date
  },
  acceptedAt: {
    type: Date,
    default: Date.now
  },
  recruitmentPeriod: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('AcceptedApplication', acceptedApplicationSchema);

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  place: { type: String, required: true },
  participants: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  participation_fee: { type: String, required: true },
  contents: { type: String, required: true },
});

module.exports = mongoose.model('Event', eventSchema);

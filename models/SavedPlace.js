const mongoose = require('mongoose');

const savedPlaceSchema = new mongoose.Schema({
  placeId: { 
    type: String, 
    required: true 
  },
  placeName: { 
    type: String, 
    required: true 
  },
  addressName: { 
    type: String, 
    required: true 
  },
  roadAddressName: String,
  phoneNumber: String,
  category: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

savedPlaceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SavedPlace', savedPlaceSchema);
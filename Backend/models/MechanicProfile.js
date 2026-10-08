const mongoose = require('mongoose');

const mechanicProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: String,
  phone: String,
  experienceYears: { type: Number, default: 0 },
  expertise: [{ type: String, enum: ['battery', 'puncture', 'fuel', 'lockout', 'engine', 'electrical', 'accident', 'general'] }],
  serviceArea: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  responseRate: { type: Number, default: 0, min: 0, max: 100 },
  responseTimeMinutes: { type: Number, default: 0 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
}, { timestamps: true });

mechanicProfileSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('MechanicProfile', mechanicProfileSchema);

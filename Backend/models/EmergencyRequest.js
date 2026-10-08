const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issueType: { type: String, enum: ['breakdown', 'battery', 'puncture', 'fuel', 'lockout', 'engine', 'accident', 'electrical', 'other'], required: true },
  description: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: String,
  },
  status: { type: String, enum: ['requested', 'accepted', 'on_the_way', 'arrived', 'repairing', 'completed', 'cancelled'], default: 'requested' },
  estimatedAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  beforePhotos: [String],
  afterPhotos: [String],
  priority: { type: String, enum: ['normal', 'emergency'], default: 'emergency' },
  acceptedAt: Date,
  completedAt: Date,
}, { timestamps: true });

emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);

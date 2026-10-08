const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['car', 'bike', 'scooter', 'other'], required: true },
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true, uppercase: true },
  year: Number,
  color: String,
}, { timestamps: true });

vehicleSchema.index({ owner: 1, registrationNumber: 1 }, { unique: true });
module.exports = mongoose.model('Vehicle', vehicleSchema);

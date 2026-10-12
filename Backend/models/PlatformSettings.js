const mongoose = require('mongoose');

// One document stores platform-wide settings configured by Admin in the dashboard.
// Do not place the Admin's UPI ID in .env or expose any private credentials here.
const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'platform' },
  adminUpiId: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    maxlength: 100,
    validate: {
      validator(value) {
        if (!value) return true;
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(value);
      },
      message: 'Please enter a valid UPI ID.',
    },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);

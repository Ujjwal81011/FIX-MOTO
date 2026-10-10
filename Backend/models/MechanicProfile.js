const mongoose = require('mongoose');

const mechanicProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    businessName: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    expertise: [
      {
        type: String,
        enum: [
          'battery',
          'puncture',
          'fuel',
          'lockout',
          'engine',
          'electrical',
          'accident',
          'general',
        ],
      },
    ],

    serviceArea: {
      type: String,
      default: '',
      trim: true,
    },

    // Mechanic's UPI ID, e.g. mechanic@upi
    // Used to display the mechanic's UPI payment details to customers.
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      maxlength: 100,
      validate: {
        validator: function (value) {
          if (!value) return true;

          // Basic format validation; this does not verify that the UPI ID exists.
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(value);
        },
        message: 'Please enter a valid UPI ID.',
      },
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationDocuments: {
      type: [String],
      default: [],
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    responseTimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Preserve geospatial queries for nearby mechanics.
mechanicProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model(
  'MechanicProfile',
  mechanicProfileSchema
);
const mongoose = require('mongoose');

const mechanicSubscriptionPaymentSchema = new mongoose.Schema({
  mechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mechanicProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MechanicProfile',
    required: true,
  },
  amount: { type: Number, required: true, enum: [199], default: 199 },
  transactionReference: { type: String, trim: true, maxlength: 120, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedAt: { type: Date, default: null },
  subscriptionStartsAt: { type: Date, default: null },
  subscriptionEndsAt: { type: Date, default: null },
  adminNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true });

// Prevent multiple simultaneous pending payment requests for one mechanic.
mechanicSubscriptionPaymentSchema.index(
  { mechanic: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
mechanicSubscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MechanicSubscriptionPayment', mechanicSubscriptionPaymentSchema);

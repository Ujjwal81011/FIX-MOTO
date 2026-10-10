const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Emergency request linked to this payment
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },

    // Customer who made the payment
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Mechanic assigned to the emergency request
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Amount must be calculated and validated by the backend
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment method selected by the customer
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'other'],
      default: 'cash',
      required: true,
    },

    // Payment lifecycle
    status: {
      type: String,
      enum: [
        'pending',
        'awaiting_confirmation',
        'proof_rejected',
        'paid',
        'failed',
        'refunded',
      ],
      default: 'pending',
      required: true,
      index: true,
    },

    // Uploaded payment screenshot URL
    proofUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Optional storage identifier, e.g. Cloudinary public ID
    proofPublicId: {
      type: String,
      trim: true,
      default: null,
    },

    // UPI transaction ID / UTR entered by the customer
    transactionId: {
      type: String,
      trim: true,
      default: null,
      maxlength: 150,
    },

    // When the customer submitted the screenshot
    proofSubmittedAt: {
      type: Date,
      default: null,
    },

    // Mechanic who confirmed the payment
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // When the mechanic confirmed the payment
    paidAt: {
      type: Date,
      default: null,
    },

    // Reason provided when payment proof is rejected
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Useful indexes for payment history and mechanic review screens
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ mechanic: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
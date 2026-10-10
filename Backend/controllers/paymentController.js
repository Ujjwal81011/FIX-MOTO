const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const EmergencyRequest = require('../models/EmergencyRequest');

const VALID_PAYMENT_METHODS = ['cash', 'upi'];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// 1. Customer creates a payment record for a completed job
async function createPayment(req, res) {
  try {
    const { requestId, method = 'cash' } = req.body;

    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid emergency request ID is required.',
      });
    }

    if (!VALID_PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be cash or upi.',
      });
    }

    const request = await EmergencyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found.',
      });
    }

    if (String(request.customer) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own emergency request.',
      });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be created for a completed job.',
      });
    }

    if (!request.mechanic) {
      return res.status(400).json({
        success: false,
        message: 'No mechanic is assigned to this request.',
      });
    }

    // Never trust an amount supplied by the customer.
    const amount = Number(request.finalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'The final job amount is invalid. Please contact support.',
      });
    }

    // Prevent creating multiple payment records for the same request.
    const existingPayment = await Payment.findOne({
      request: request._id,
    });

    if (existingPayment) {
      if (String(existingPayment.customer) !== String(req.user._id)) {
        return res.status(409).json({
          success: false,
          message: 'A payment record already exists for this request.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'A payment record already exists for this request.',
        payment: existingPayment,
      });
    }

    const payment = await Payment.create({
      request: request._id,
      customer: req.user._id,
      mechanic: request.mechanic,
      amount,
      method,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Payment record created successfully.',
      payment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A payment record already exists for this request.',
      });
    }

    console.error('createPayment error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create payment.',
    });
  }
}

// 2. Customer uploads UPI payment proof.
// An upload middleware must populate req.file before this handler runs.
async function uploadPaymentProof(req, res) {
  try {
    const { transactionId } = req.body;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your payment screenshot.',
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    if (String(payment.customer) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload proof for your own payment.',
      });
    }

    if (payment.method !== 'upi') {
      return res.status(400).json({
        success: false,
        message: 'Screenshot proof is only required for UPI payments.',
      });
    }

    if (!['pending', 'proof_rejected'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Proof cannot be uploaded for the current payment status.',
      });
    }

    // Cloud storage middleware should provide a persistent URL.
    const proofUrl = req.file.secure_url || req.file.path;

    if (!proofUrl) {
      return res.status(500).json({
        success: false,
        message: 'The uploaded screenshot could not be stored.',
      });
    }

    payment.proofUrl = proofUrl;

    if (req.file.public_id) {
      payment.proofPublicId = req.file.public_id;
    }

    payment.transactionId =
      typeof transactionId === 'string' && transactionId.trim()
        ? transactionId.trim()
        : null;

    payment.proofSubmittedAt = new Date();
    payment.status = 'awaiting_confirmation';
    payment.rejectionReason = null;

    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment proof uploaded. Waiting for mechanic confirmation.',
      payment,
    });
  } catch (error) {
    console.error('uploadPaymentProof error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to upload payment proof.',
    });
  }
}

// 3. Customer views their own payment history
async function myPayments(req, res) {
  try {
    const payments = await Payment.find({
      customer: req.user._id,
    })
      .populate('request')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('myPayments error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch your payments.',
    });
  }
}

// 4. Mechanic views payments assigned to them
async function mechanicPayments(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Only mechanics can access this payment list.',
      });
    }

    const payments = await Payment.find({
      mechanic: req.user._id,
      status: {
        $in: ['pending', 'awaiting_confirmation', 'proof_rejected'],
      },
    })
      .populate('request')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('mechanicPayments error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch mechanic payments.',
    });
  }
}

// 5. Mechanic confirms that payment has actually been received
async function confirmPayment(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Only a mechanic can confirm payment.',
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID.',
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    // Only the mechanic assigned to this payment can confirm it.
    if (String(payment.mechanic) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this payment.',
      });
    }

    if (payment.status === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'This payment has already been confirmed.',
      });
    }

    if (payment.method === 'upi' && payment.status !== 'awaiting_confirmation') {
      return res.status(400).json({
        success: false,
        message: 'A submitted UPI proof is required before confirmation.',
      });
    }

    if (payment.method === 'cash' && payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This cash payment cannot be confirmed in its current status.',
      });
    }

    if (!['cash', 'upi'].includes(payment.method)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method.',
      });
    }

    payment.status = 'paid';
    payment.verifiedBy = req.user._id;
    payment.paidAt = new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully.',
      payment,
    });
  } catch (error) {
    console.error('confirmPayment error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to confirm payment.',
    });
  }
}

// 6. Mechanic rejects a submitted UPI proof
async function rejectPaymentProof(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Only a mechanic can reject payment proof.',
      });
    }

    const { id } = req.params;
    const reason =
      typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID.',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejecting the proof.',
      });
    }

    if (reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'The rejection reason cannot exceed 500 characters.',
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    if (String(payment.mechanic) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this payment proof.',
      });
    }

    if (
      payment.method !== 'upi' ||
      payment.status !== 'awaiting_confirmation' ||
      !payment.proofUrl
    ) {
      return res.status(400).json({
        success: false,
        message: 'There is no pending UPI proof to reject.',
      });
    }

    payment.status = 'proof_rejected';
    payment.rejectionReason = reason;

    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment proof rejected. The customer can upload proof again.',
      payment,
    });
  } catch (error) {
    console.error('rejectPaymentProof error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to reject payment proof.',
    });
  }
}

module.exports = {
  createPayment,
  uploadPaymentProof,
  myPayments,
  mechanicPayments,
  confirmPayment,
  rejectPaymentProof,
};
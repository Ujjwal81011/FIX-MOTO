const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const EmergencyRequest = require('../models/EmergencyRequest');
const MechanicProfile = require('../models/MechanicProfile');
const Notification = require('../models/Notification');

const VALID_PAYMENT_METHODS = ['cash', 'upi'];
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function createPayment(req, res) {
  try {
    const { requestId, method = 'cash' } = req.body;
    if (!requestId || !isValidObjectId(requestId)) return res.status(400).json({ success: false, message: 'A valid emergency request ID is required.' });
    if (!VALID_PAYMENT_METHODS.includes(method)) return res.status(400).json({ success: false, message: 'Payment method must be cash or upi.' });

    const request = await EmergencyRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    if (String(request.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You can only pay for your own emergency request.' });
    if (request.status !== 'completed') return res.status(400).json({ success: false, message: 'Payment can only be created for a completed job.' });
    if (request.billStatus !== 'approved') return res.status(400).json({ success: false, message: 'The itemized bill must be approved before payment.' });
    if (!request.mechanic) return res.status(400).json({ success: false, message: 'No mechanic is assigned to this request.' });

    const amount = Number(request.finalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'The approved bill amount is invalid.' });

    let payment = await Payment.findOne({ request: request._id });
    if (payment && String(payment.customer) !== String(req.user._id)) return res.status(409).json({ success: false, message: 'A payment record already exists for this request.' });
    if (payment && payment.status === 'paid') {
      const profile = await MechanicProfile.findOne({ user: request.mechanic }).select('upiId');
      return res.json({ success: true, message: 'This payment is already confirmed.', payment, mechanicUpiId: profile?.upiId || '' });
    }
    if (payment && payment.method !== method && payment.status !== 'pending') return res.status(409).json({ success: false, message: 'A payment attempt already exists. Continue with the selected method on that record.' });
    if (!payment) payment = await Payment.create({ request: request._id, customer: req.user._id, mechanic: request.mechanic, amount, method, status: 'pending' });
    else if (payment.status === 'pending') { payment.method = method; payment.amount = amount; await payment.save(); }

    const profile = await MechanicProfile.findOne({ user: request.mechanic }).select('upiId');
    return res.status(200).json({ success: true, message: 'Payment record ready.', payment, mechanicUpiId: profile?.upiId || '' });
  } catch (error) {
    console.error('createPayment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create payment.' });
  }
}

// Customer tells the mechanic that UPI transfer or cash handover is complete.
// This only requests confirmation; it never marks the payment as paid.
async function markPaymentDone(req, res) {
  try {
    const { id } = req.params;
    const transactionId = typeof req.body.transactionId === 'string' ? req.body.transactionId.trim().slice(0, 150) : '';
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (String(payment.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'You can only update your own payment.' });
    if (payment.status === 'paid') return res.status(409).json({ success: false, message: 'This payment is already confirmed.' });
    if (!['cash', 'upi'].includes(payment.method)) return res.status(400).json({ success: false, message: 'Unsupported payment method.' });
    if (!['pending', 'proof_rejected'].includes(payment.status)) return res.status(400).json({ success: false, message: 'This payment is already awaiting mechanic confirmation.' });
    payment.transactionId = payment.method === 'upi' ? (transactionId || null) : null;
    payment.proofSubmittedAt = new Date();
    payment.status = 'awaiting_confirmation';
    payment.rejectionReason = null;
    await payment.save();
    await Notification.create({ user: payment.mechanic, title: 'Payment confirmation requested', message: `Customer says ₹${Number(payment.amount).toFixed(2)} was paid by ${payment.method.toUpperCase()}. Verify receipt before confirming.`, type: 'payment', data: { paymentId: payment._id, requestId: payment.request } });
    req.app.get('io')?.to(`user:${payment.mechanic}`).emit('payment:confirmation-requested', { paymentId: payment._id, requestId: payment.request, amount: payment.amount, method: payment.method });
    return res.json({ success: true, message: 'Confirmation request sent. The mechanic must verify receipt before the payment is marked paid.', payment });
  } catch (error) {
    console.error('markPaymentDone error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit payment confirmation request.' });
  }
}

async function myPayments(req, res) {
  try {
    const payments = await Payment.find({ customer: req.user._id }).populate('request').populate('mechanic', 'name phone').sort({ createdAt: -1 });
    const withUpi = await Promise.all(payments.map(async (payment) => {
      const profile = await MechanicProfile.findOne({ user: payment.mechanic?._id || payment.mechanic }).select('upiId');
      return { ...payment.toObject(), mechanicUpiId: profile?.upiId || '' };
    }));
    return res.json({ success: true, count: withUpi.length, payments: withUpi });
  } catch (error) {
    console.error('myPayments error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch your payments.' });
  }
}

async function mechanicPayments(req, res) {
  try {
    const payments = await Payment.find({ mechanic: req.user._id }).populate('request').populate('customer', 'name email phone').sort({ createdAt: -1 });
    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('mechanicPayments error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch mechanic payments.' });
  }
}

async function confirmPayment(req, res) {
  try {
    if (req.user.role !== 'mechanic') return res.status(403).json({ success: false, message: 'Only a mechanic can confirm payment.' });
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (String(payment.mechanic) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only the mechanic assigned to this payment can confirm it.' });
    if (payment.status === 'paid') return res.status(409).json({ success: false, message: 'This payment has already been confirmed.' });
    if (payment.status !== 'awaiting_confirmation') return res.status(400).json({ success: false, message: 'The customer must first click Payment Done.' });
    // Important: verify the actual UPI credit or cash received before confirming.
    payment.status = 'paid';
    payment.verifiedBy = req.user._id;
    payment.paidAt = new Date();
    await payment.save();
    await Notification.create({ user: payment.customer, title: 'Payment confirmed', message: `Your payment of ₹${Number(payment.amount).toFixed(2)} has been confirmed by the mechanic.`, type: 'payment', data: { paymentId: payment._id, requestId: payment.request } });
    req.app.get('io')?.to(`user:${payment.customer}`).emit('payment:confirmed', { paymentId: payment._id, requestId: payment.request, amount: payment.amount });
    return res.json({ success: true, message: 'Payment confirmed successfully.', payment });
  } catch (error) {
    console.error('confirmPayment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to confirm payment.' });
  }
}

module.exports = { createPayment, markPaymentDone, myPayments, mechanicPayments, confirmPayment };

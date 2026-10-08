const Payment = require('../models/Payment');
const EmergencyRequest = require('../models/EmergencyRequest');

async function createPayment(req, res) {
  const { requestId, amount, method } = req.body;
  const request = await EmergencyRequest.findById(requestId);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (String(request.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only customer can create payment' });
  const payment = await Payment.create({ request: requestId, customer: req.user._id, mechanic: request.mechanic, amount: Number(amount ?? request.finalAmount), method: method || 'cash', status: method === 'cash' ? 'pending' : 'pending' });
  res.status(201).json({ success: true, message: 'Payment record created', payment });
}

async function markPaid(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (String(payment.customer) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not allowed' });
  payment.status = 'paid';
  payment.transactionId = req.body.transactionId || payment.transactionId || `TXN-${Date.now()}`;
  payment.paidAt = new Date();
  await payment.save();
  res.json({ success: true, message: 'Payment marked as paid', payment });
}

async function myPayments(req, res) {
  const payments = await Payment.find({ customer: req.user._id }).populate('request').sort({ createdAt: -1 });
  res.json({ success: true, count: payments.length, payments });
}

module.exports = { createPayment, markPaid, myPayments };

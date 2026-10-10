const express = require('express');

const {
  createPayment,
  uploadPaymentProof,
  myPayments,
  mechanicPayments,
  confirmPayment,
  rejectPaymentProof,
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All payment routes require a valid login token.
router.use(protect);

// Customer: create a payment record.
router.post(
  '/',
  authorize('customer'),
  createPayment
);

// Customer: view their own payment history.
router.get(
  '/mine',
  authorize('customer'),
  myPayments
);

// Customer: upload UPI payment screenshot.
// NOTE: Add the configured upload middleware before uploadPaymentProof.
// Example: router.post('/:id/proof', authorize('customer'), upload.single('proof'), uploadPaymentProof);
router.post(
  '/:id/proof',
  authorize('customer'),
  uploadPaymentProof
);

// Mechanic: view assigned pending payments and submitted proofs.
router.get(
  '/mechanic',
  authorize('mechanic'),
  mechanicPayments
);

// Assigned mechanic: confirm payment received.
router.patch(
  '/:id/confirm',
  authorize('mechanic'),
  confirmPayment
);

// Assigned mechanic: reject a submitted UPI proof.
router.patch(
  '/:id/reject',
  authorize('mechanic'),
  rejectPaymentProof
);

module.exports = router;
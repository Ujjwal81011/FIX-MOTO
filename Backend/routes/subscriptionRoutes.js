const express = require('express');
const {
  getAdminSubscriptionSettings,
  updateAdminSubscriptionSettings,
  getMySubscription,
  createSubscriptionPayment,
  listSubscriptionPayments,
  acknowledgeSubscriptionPayment,
  rejectSubscriptionPayment,
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/mine', authorize('mechanic'), getMySubscription);
router.post('/mine/payment', authorize('mechanic'), createSubscriptionPayment);

router.get('/admin/settings', authorize('admin'), getAdminSubscriptionSettings);
router.put('/admin/settings', authorize('admin'), updateAdminSubscriptionSettings);
router.get('/admin/payments', authorize('admin'), listSubscriptionPayments);
router.patch('/admin/payments/:id/acknowledge', authorize('admin'), acknowledgeSubscriptionPayment);
router.patch('/admin/payments/:id/reject', authorize('admin'), rejectSubscriptionPayment);

module.exports = router;

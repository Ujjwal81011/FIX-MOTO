const express = require('express');

const {
  createEmergency,
  getAvailableRequests,
  getMyRequests,
  getMyCompletedJobs,
  getRequest,
  acceptRequest,
  updateStatus,
  submitBill,
  approveBill,
  requestBillRevision,
  cancelRequest,
  listAll,
} = require('../controllers/emergencyController');

const {
  protect,
  authorize,
} = require('../middleware/authMiddleware');

const router = express.Router();

// All emergency routes require authentication.
router.use(protect);

// ======================================================
// CUSTOMER
// ======================================================

router.post(
  '/',
  authorize('customer'),
  createEmergency
);

router.get(
  '/mine',
  authorize('customer'),
  getMyRequests
);

// ======================================================
// MECHANIC
// ======================================================

// Available emergency requests
router.get(
  '/available',
  authorize('mechanic'),
  getAvailableRequests
);

// Completed jobs history
// Keep this before the /:id route.
router.get(
  '/history',
  authorize('mechanic'),
  getMyCompletedJobs
);

// Accept an emergency request
router.patch(
  '/:id/accept',
  authorize('mechanic'),
  acceptRequest
);

// Update request status
router.patch(
  '/:id/status',
  authorize('mechanic', 'admin'),
  updateStatus
);

// Bill flow: mechanic submits; customer approves or requests a revision.
router.patch('/:id/bill', authorize('mechanic'), submitBill);
router.patch('/:id/bill/approve', authorize('customer'), approveBill);
router.patch('/:id/bill/revision', authorize('customer'), requestBillRevision);

// ======================================================
// ADMIN
// ======================================================

router.get(
  '/all',
  authorize('admin'),
  listAll
);

// ======================================================
// COMMON
// ======================================================

// Get a single emergency request
router.get(
  '/:id',
  getRequest
);

// Cancel an emergency request
router.patch(
  '/:id/cancel',
  authorize('customer', 'admin'),
  cancelRequest
);

module.exports = router;
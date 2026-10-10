const express = require('express');

const {
  createEmergency,
  getAvailableRequests,
  getMyRequests,
  getMyCompletedJobs,
  getRequest,
  acceptRequest,
  updateStatus,
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
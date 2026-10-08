const express = require('express');

const {
  createEmergency,
  getAvailableRequests,
  getMyRequests,
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

// IMPORTANT:
// This must be before /:id
router.get(
  '/available',
  authorize('mechanic'),
  getAvailableRequests
);

router.patch(
  '/:id/accept',
  authorize('mechanic'),
  acceptRequest
);

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

router.get(
  '/:id',
  getRequest
);

router.patch(
  '/:id/cancel',
  authorize('customer', 'admin'),
  cancelRequest
);


module.exports = router;
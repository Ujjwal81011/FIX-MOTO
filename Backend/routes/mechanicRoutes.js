const express = require('express');
const {
  createOrUpdateProfile,
  getMyProfile,
  getNearbyMechanics,
  updateStatus,
  updateLocation,
  listMechanics,
  verifyMechanic,
} = require('../controllers/mechanicController');
const {
  protect,
  authorize,
} = require('../middleware/authMiddleware');
const router = express.Router();
// Nearby mechanics search for authenticated users.
router.get('/nearby', protect, getNearbyMechanics);
// Admin-only mechanic list.
router.get(
  '/',
  protect,
  authorize('admin'),
  listMechanics
);

// Admin-only verification management.
router.patch(
  '/:id/verify',
  protect,
  authorize('admin'),
  verifyMechanic
);

// All routes below require a logged-in mechanic.
router.use(protect, authorize('mechanic'));

// Get the logged-in mechanic's profile, including upiId.
router.get('/profile', getMyProfile);

// Save profile details, including upiId.
router.put('/profile', createOrUpdateProfile);

// Update online/offline status.
router.patch('/status', updateStatus);

// Update current mechanic location.
router.patch('/location', updateLocation);

module.exports = router;
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
router.get('/nearby', protect, getNearbyMechanics);
router.get(
  '/',
  protect,
  authorize('admin'),
  listMechanics
);

router.patch(
  '/:id/verify',
  protect,
  authorize('admin'),
  verifyMechanic
);
// From this point onwards only logged-in mechanics
// are allowed to access these routes.
router.use(
  protect,
  authorize('mechanic')
);
// Get logged-in mechanic profile
router.get(
  '/profile',
  getMyProfile
);
// Create or update logged-in mechanic profile
router.put(
  '/profile',
  createOrUpdateProfile
);
// Update mechanic online/offline status
router.patch(
  '/status',
  updateStatus
);
// Update mechanic location
router.patch(
  '/location',
  updateLocation
);
module.exports = router;
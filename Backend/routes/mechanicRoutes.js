const express = require('express');
const { createOrUpdateProfile, getMyProfile, getNearbyMechanics, updateStatus, updateLocation, listMechanics } = require('../controllers/mechanicController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/nearby', protect, getNearbyMechanics);
router.get('/', protect, authorize('admin'), listMechanics);
router.use(protect, authorize('mechanic'));
router.get('/profile', getMyProfile);
router.put('/profile', createOrUpdateProfile);
router.patch('/status', updateStatus);
router.patch('/location', updateLocation);

module.exports = router;

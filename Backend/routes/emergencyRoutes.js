const express = require('express');
const { createEmergency, getMyRequests, getRequest, acceptRequest, updateStatus, cancelRequest, listAll } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.post('/', authorize('customer'), createEmergency);
router.get('/mine', authorize('customer'), getMyRequests);
router.get('/all', authorize('admin'), listAll);
router.get('/:id', getRequest);
router.patch('/:id/accept', authorize('mechanic'), acceptRequest);
router.patch('/:id/status', authorize('mechanic', 'admin'), updateStatus);
router.patch('/:id/cancel', authorize('customer', 'admin'), cancelRequest);

module.exports = router;

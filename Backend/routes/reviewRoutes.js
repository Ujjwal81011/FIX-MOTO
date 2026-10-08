const express = require('express');
const { createReview, listMechanicReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.post('/', createReview);
router.get('/mechanic/:mechanicId', listMechanicReviews);

module.exports = router;

const express = require('express');
const { createPayment, markPaid, myPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.post('/', createPayment);
router.get('/mine', myPayments);
router.patch('/:id/pay', markPaid);

module.exports = router;

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  requestBooking,
  respondToBooking,
  checkInBooking,
  checkOutBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.post('/request', authMiddleware, requestBooking);
router.patch('/:id/respond', authMiddleware, respondToBooking);
router.patch('/:id/checkin', authMiddleware, checkInBooking);
router.patch('/:id/checkout', authMiddleware, checkOutBooking);

module.exports = router;

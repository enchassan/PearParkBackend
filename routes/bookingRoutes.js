import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  listBookings,
  requestBooking,
  respondToBooking,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
} from '../controllers/bookingController.js';

const router = express.Router();

router.get('', authMiddleware, listBookings);
router.post('/request', authMiddleware, requestBooking);
router.patch('/:id/respond', authMiddleware, respondToBooking);
router.patch('/:id/checkin', authMiddleware, checkInBooking);
router.patch('/:id/checkout', authMiddleware, checkOutBooking);
router.patch('/:id/cancel', authMiddleware, cancelBooking);

export default router;
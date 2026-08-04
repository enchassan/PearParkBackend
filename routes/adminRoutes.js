import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import rbacMiddleware from '../middleware/rbacMiddleware.js';
import { getUsers, getVerifications, approveUser, rejectUser, getFlaggedSpots, suspendSpot } from '../controllers/adminController.js';

const router = express.Router();

router.use(authMiddleware, rbacMiddleware);

router.get('/users', getUsers);
router.get('/verifications', getVerifications);
router.patch('/users/:id/approve', approveUser);
router.delete('/users/:id', rejectUser);
router.get('/spots/flagged', getFlaggedSpots);
router.patch('/spots/:id/suspend', suspendSpot);

export default router;

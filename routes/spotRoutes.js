import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { listSpots, createSpot, deleteSpot, toggleSpot, getNearbySpots } from '../controllers/spotController.js';

const router = express.Router();

router.get('', authMiddleware, listSpots);
router.post('/create', authMiddleware, createSpot);
router.delete('/:id', authMiddleware, deleteSpot);
router.patch('/:id/toggle', authMiddleware, toggleSpot);
router.get('/nearby', getNearbySpots);

export default router;

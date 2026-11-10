import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  listSpots,
  getMySpots,
  createSpot,
  deleteSpot,
  toggleSpot,
  getNearbySpots,
  getSpotSchedule,
} from '../controllers/spotController.js';

const router = express.Router();

// 1. Public discovery & schedule routes
router.get('/nearby', getNearbySpots);
router.get('/:id/schedule', getSpotSchedule);

// 2. Host & authenticated spot management
router.get('/my', authMiddleware, getMySpots);
router.get('', authMiddleware, listSpots);
router.post('/create', authMiddleware, createSpot);
router.delete('/:id', authMiddleware, deleteSpot);
router.patch('/:id/toggle', authMiddleware, toggleSpot);

export default router;
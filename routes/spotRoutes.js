import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  listSpots,
  getMySpots,
  createSpot,
  deleteSpot,
  toggleSpot,
  getNearbySpots,
} from '../controllers/spotController.js';

const router = express.Router();

// Public / discovery routes
router.get('/nearby', getNearbySpots);

// Host & authenticated spot routes
router.get('/my', authMiddleware, getMySpots);
router.get('', authMiddleware, listSpots);
router.post('/create', authMiddleware, createSpot);
router.delete('/:id', authMiddleware, deleteSpot);
router.patch('/:id/toggle', authMiddleware, toggleSpot);

export default router;
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createSpot, toggleSpot, getNearbySpots } = require('../controllers/spotController');

const router = express.Router();

router.post('/create', authMiddleware, createSpot);
router.patch('/:id/toggle', authMiddleware, toggleSpot);
router.get('/nearby', getNearbySpots);

module.exports = router;

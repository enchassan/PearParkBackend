const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const rbacMiddleware = require('../middleware/rbacMiddleware');
const {
  getVerifications,
  approveUser,
  getFlaggedSpots,
  suspendSpot,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, rbacMiddleware);

router.get('/verifications', getVerifications);
router.patch('/users/:id/approve', approveUser);
router.get('/spots/flagged', getFlaggedSpots);
router.patch('/spots/:id/suspend', suspendSpot);

module.exports = router;

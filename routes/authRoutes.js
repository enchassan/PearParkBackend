import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  register,
  login,
  getMe,
  updateProfile,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.patch('/profile', authMiddleware, updateProfile);

export default router;

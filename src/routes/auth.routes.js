import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/announcements', authController.getPublicAnnouncements);
router.get('/me', protect, authController.getMe);

// New: Forgot and reset password
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
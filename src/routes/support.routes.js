import express from 'express';
import { supportController } from '../controllers/support.controller.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/feedback', protect, supportController.sendFeedback);

export default router;
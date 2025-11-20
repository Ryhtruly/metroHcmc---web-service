import express from 'express';
import { scannerController } from '../controllers/scanner.controller.js';
import { protect, inspectorOnly } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/scan', protect, inspectorOnly, scannerController.scanTicket);

export default router;
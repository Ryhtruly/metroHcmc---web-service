import express from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { protect, customerOnly } from '../middleware/authMiddleware.js'; // Giả sử Tình/Trí có 'customerOnly'

const router = express.Router();

router.post('/create', protect, customerOnly, paymentController.createPaymentRequest);
router.post('/create-demo', protect, customerOnly, paymentController.createPaymentDemo);
router.post('/confirm-webhook', paymentController.confirmPaymentWebhook);

export default router;
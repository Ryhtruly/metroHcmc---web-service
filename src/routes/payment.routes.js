import express from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { protect, customerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, customerOnly, paymentController.createPaymentRequest);
router.post('/create-demo', protect, customerOnly, paymentController.createPaymentDemo);
router.post('/confirm-webhook', paymentController.confirmPaymentWebhook);
router.get('/payos-cancel', paymentController.handlePayOSCancel);

export default router;
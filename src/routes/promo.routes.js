import express from "express";
import { redeemGiftcodeController } from "../controllers/promo.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { promoController } from '../controllers/promo.controller.js';

const router = express.Router();

router.post("/redeem", protect, redeemGiftcodeController);
router.post('/check', protect, promoController.checkPromoCode);

export default router;

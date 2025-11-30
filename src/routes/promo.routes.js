import express from "express";
import { redeemGiftcodeController } from "../controllers/promo.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/redeem", protect, redeemGiftcodeController);

export default router;

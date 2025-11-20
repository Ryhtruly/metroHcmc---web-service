import express from "express";
import { protect } from "../middleware/authMiddleware.js";  // <-- FIXED
import { adminOnly } from "../middleware/adminOnly.js";
import * as adminController from "../controllers/admin.controller.js";

const router = express.Router();

// 7 API cấu hình
router.post("/lines", protect, adminOnly, adminController.upsertLine);
router.post("/stations", protect, adminOnly, adminController.upsertStation);
router.post("/segments", protect, adminOnly, adminController.upsertSegment);
router.post("/fare-rules", protect, adminOnly, adminController.setActiveFareRule);
router.post("/ticket-products", protect, adminOnly, adminController.upsertTicketProduct);
router.post("/promotions", protect, adminOnly, adminController.upsertPromotion);
router.post("/announcements", protect, adminOnly, adminController.upsertAnnouncement);

// 2 API báo cáo
router.get("/report/sales", protect, adminOnly, adminController.reportSales);
router.get("/report/traffic", protect, adminOnly, adminController.reportTraffic);

// 2 API nhật ký
router.get("/audit", protect, adminOnly, adminController.getAuditLog);
router.get("/payments", protect, adminOnly, adminController.getPayments);

export default router;

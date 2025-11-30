import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/admin.controller.js";
import * as promoController from "../controllers/promo.controller.js"; 


const router = express.Router();

// 7 API cấu hình
router.post("/lines", protect, adminOnly, adminController.upsertLine);
router.post("/stations", protect, adminOnly, adminController.upsertStation);
router.post("/segments", protect, adminOnly, adminController.upsertSegment);
router.post("/fare-rules", protect, adminOnly, adminController.setActiveFareRule);
router.post("/ticket-products", protect, adminOnly, adminController.upsertTicketProduct);
router.post("/promotions", protect, adminOnly, adminController.upsertPromotion);
router.post("/announcements", protect, adminOnly, adminController.upsertAnnouncement);
router.get("/announcements", protect, adminOnly, adminController.getAnnouncements);

// 2 API báo cáo
router.get("/report/sales", protect, adminOnly, adminController.reportSales);
router.get("/report/traffic", protect, adminOnly, adminController.reportTraffic);

// 2 API nhật ký
router.get("/audit", protect, adminOnly, adminController.getAuditLog);
router.get("/payments", protect, adminOnly, adminController.getPayments);
// ...
router.get('/dashboard-stats', protect, adminOnly, adminController.getDashboardStats);
// ...
router.get("/report/ticket-types", protect, adminOnly, adminController.reportTicketTypes);

router.post("/promotions", protect, adminOnly, adminController.upsertPromotion); // Tạo/Sửa
router.get("/promotions", protect, adminOnly, adminController.getPromotions);

router.get("/fare-rules", protect, adminOnly, adminController.getFareRules);
router.get("/ticket-products", protect, adminOnly, adminController.getTicketProducts);

// API Ga
router.get("/stations", protect, adminOnly, adminController.getAllStations); 
router.delete("/stations/:code", protect, adminOnly, adminController.deleteStation); 

// api giftcodes
router.post("/giftcodes/batch", protect, adminOnly, adminController.createGiftcodeBatch);
router.get("/giftcodes", protect, adminOnly, adminController.getGiftcodes);

export default router;

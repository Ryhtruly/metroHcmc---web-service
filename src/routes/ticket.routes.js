import express from 'express';
import ticketController from '../controllers/ticket.controller.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// ==============================
// 🔓 PUBLIC (Không cần Token)
// ==============================
router.get('/lines', ticketController.getLines);
router.get('/lines/:line_code/stations', ticketController.getStations);
router.post('/quote/single', ticketController.quoteSingle);

router.get('/products', ticketController.getProducts); 


// ==============================
// 🔒 PROTECTED (Cần Token)
// ==============================
router.post('/single', protect, ticketController.createSingle);
router.post('/pass', protect, ticketController.createPass);
router.get('/my-tickets', protect, ticketController.getMyTickets);
router.get('/:id', protect, ticketController.getTicketDetail);
router.post('/admin/products', protect, ticketController.addTicketProduct);
router.get('/admin/customer/:userId', protect, ticketController.getCustomerTicketsForAdmin);

export default router;
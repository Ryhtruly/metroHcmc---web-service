import express from 'express';
import ticketController from '../controllers/ticket.controller.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Public
router.get('/lines', ticketController.getLines);
router.get('/lines/:line_code/stations', ticketController.getStations);
router.post('/quote/single', ticketController.quoteSingle);

// Protected
router.post('/single', protect, ticketController.createSingle);
router.post('/pass', protect, ticketController.createPass);
router.get('/my-tickets', protect, ticketController.getMyTickets);
router.get('/:id', protect, ticketController.getTicketDetail);

export default router;
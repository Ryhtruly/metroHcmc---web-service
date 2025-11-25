import ticketService from '../services/ticket.service.js';

const ticketController = {
  getLines: async (req, res) => {
    try {
      const data = await ticketService.getLines();
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getStations: async (req, res) => {
    try {
      const { line_code } = req.params;
      const data = await ticketService.getStations(line_code);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getProducts: async (req, res) => {
    try {
      // Hàm này giờ đã gọi đúng Function SQL
      const data = await ticketService.getTicketProducts(); 
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getProducts: async (req, res) => {
    try {
      const data = await ticketService.getTicketProducts();
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  quoteSingle: async (req, res) => {
    try {
      const { line_code, from_station, to_station, promo_code } = req.body;
      const data = await ticketService.quoteSingleTicket(line_code, from_station, to_station, promo_code);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createSingle: async (req, res) => {
    try {
      const userId = req.user.user_id; 
      const { line_code, from_station, to_station, stops, final_price, promo_code } = req.body;
      
      const data = await ticketService.createSingleTicket(
        userId, line_code, from_station, to_station, stops, final_price, promo_code
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createPass: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { product_code, promo_code } = req.body;
      
      const data = await ticketService.createPassTicket(userId, product_code, promo_code);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getMyTickets: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { status } = req.query; 
      const data = await ticketService.getUserTickets(userId, status);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getTicketDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await ticketService.getTicketDetail(id);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default ticketController;
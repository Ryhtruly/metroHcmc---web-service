import { customerService } from '../services/customer.service.js';

const customerController = {
  // Lấy danh sách khách hàng
  getCustomers: async (req, res) => {
    try {
      const data = await customerService.getAllCustomers();
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 🔥 MỚI: Cập nhật trạng thái (Khóa/Mở khóa)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await customerService.updateStatus(id, status);
      res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 🔥 MỚI: Lấy lịch sử đi tàu
  getHistory: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await customerService.getHistory(id);
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 🔥 MỚI: Lấy danh sách Giftcode khả dụng để tặng
  getAvailableCodes: async (req, res) => {
    try {
      const data = await customerService.getValidCodes();
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  sendGift: async (req, res) => {
    try {
      const { userId, promoCode, title, content } = req.body;
      console.log("Đang gửi quà cho:", userId); // Để anh check log ở Terminal
      
      const result = await customerService.sendGift(userId, promoCode, title, content);
      res.json(result);
    } catch (err) {
      console.error("Lỗi Controller:", err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default customerController;
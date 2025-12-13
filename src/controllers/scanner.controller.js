import { scannerService } from '../services/scanner.service.js';

const scanTicket = async (req, res) => {
  try {
    const { qr_code, station_code, direction } = req.body;
    const actor_user_id = req.user.user_id; 

    if (!qr_code || !station_code || !direction) {
      return res.status(400).json({ success: false, message: 'Thiếu qr_code hoặc station_code hoặc direction' });
    }

    if (!['IN', 'OUT'].includes(direction)) {
      return res.status(400).json({ success: false, message: 'Direction phải là IN hoặc OUT' });
    }

    const dbResponse = await scannerService.scanTicket(qr_code, station_code, direction, actor_user_id);

    if (dbResponse.success) {
      res.status(200).json(dbResponse); 
    } else {
      // Trả về 400 (Bad Request) nếu vé không hợp lệ (đã dùng, hết hạn...)
      res.status(400).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const scannerController = {
  scanTicket,
};
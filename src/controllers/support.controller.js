import { supportService } from '../services/support.service.js';

const sendFeedback = async (req, res) => {
  try {
    const userId = req.user.user_id; // Lấy từ token
    const { title, content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
    }

    const result = await supportService.sendFeedback(userId, title || 'Góp ý chung', content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const supportController = {
  sendFeedback,
};
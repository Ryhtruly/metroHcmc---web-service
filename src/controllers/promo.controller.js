// import { redeemGiftcodeService } from "../services/promo.service.js";

// export async function redeemGiftcodeController(req, res) {
//   try {
//     const userId = req.user.user_id;
//     const { code } = req.body;

//     const result = await redeemGiftcodeService(userId, code);

//     return res.json(result);

//   } catch (err) {
//     console.error("redeemGiftcodeController error:", err);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// }

import { redeemGiftcodeService } from "../services/promo.service.js";
import { promoService } from '../services/promo.service.js';

/**
 * 1) Đổi mã Giftcode (Customer)
 * POST /api/giftcodes/redeem
 */
export async function redeemGiftcodeController(req, res) {
  try {
    // Lấy userId từ token đã xác thực
    const userId = req.user.user_id; 
    const { code } = req.body;

    // Gọi Service
    const result = await redeemGiftcodeService(userId, code);

    // Hàm DB trả về JSON có cấu trúc {ok: boolean, message: string, data: ...}
    // Ta trả về trực tiếp kết quả này
    return res.json(result); 

  } catch (err) {
    console.error("redeemGiftcodeController error:", err);
    // Trả về lỗi 500 với thông báo chung (hoặc thông báo lỗi chi tiết từ err nếu an toàn)
    return res.status(500).json({ ok: false, message: "Lỗi hệ thống khi đổi mã." });
  }
}

const checkPromoCode = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { code, original_price } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã khuyến mãi' });
    }

    // Giá gốc mặc định là 0 nếu không truyền lên
    const price = Number(original_price) || 0;

    const result = await promoService.checkPromotion(code, price, user_id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (err) {
    console.error("Check Promo Error:", err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra mã' });
  }
};

export const promoController = {
  checkPromoCode
};
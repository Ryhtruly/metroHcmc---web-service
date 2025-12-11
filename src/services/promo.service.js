import { pool } from "../config/db.js";

/**
 * Gọi hàm SQL để đổi mã Giftcode.
 * @param {string} userId - ID người dùng (UUID).
 * @param {string} code - Mã code (TEXT).
 * @returns {Promise<object>} JSON kết quả từ hàm DB.
 */
export async function redeemGiftcodeService(userId, code) {
  // KHẮC PHỤC LỖI: ÉP KIỂU TƯỜNG MINH cho cả hai tham số
  const sql = `
    SELECT api.fn_redeem_giftcode_json($1::UUID, $2::TEXT) AS result
  `;

  // Đảm bảo thứ tự tham số là [UUID, TEXT]
  const result = await pool.query(sql, [userId, code]);

  // Hàm SQL trả về JSON, nên chúng ta cần trả về giá trị đó
  // Giả định hàm unwrap giúp lấy result.rows[0].result
  return result.rows[0]?.result; 
}

const checkPromotion = async (code, original_price, user_id) => {
  const query = 'SELECT api.fn_check_promotion_json($1, $2, $3) as result';
  const { rows } = await pool.query(query, [code, original_price, user_id]);
  return rows[0].result;
};

export const promoService = {
  checkPromotion
};
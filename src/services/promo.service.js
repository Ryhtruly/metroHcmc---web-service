import { pool } from "../config/db.js";

/**
 * Gọi hàm SQL để đổi mã Giftcode.
 * @param {string} userId - ID người dùng (phải là UUID).
 * @param {string} code - Mã code (TEXT).
 * @returns {Promise<object>} JSON kết quả từ hàm DB.
 */
export async function redeemGiftcodeService(userId, code) {
  // THÊM ÉP KIỂU TƯỜNG MINH (::UUID, ::TEXT)
  // Điều này giải quyết lỗi "function is not unique"
  const sql = `
    SELECT api.fn_redeem_giftcode_json($1::UUID, $2::TEXT) AS result
  `;

  // Đảm bảo thứ tự tham số là [UUID, TEXT]
  const result = await pool.query(sql, [userId, code]);

  // Hàm SQL trả về JSON, nên chúng ta cần trả về giá trị đó
  return result.rows[0].result;
}
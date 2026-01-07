import { pool } from '../config/db.js';

export const customerService = {
  getAllCustomers: async () => {
    const result = await pool.query("SELECT api.fn_get_customers_json() as data");
    return result.rows[0].data || [];
  },
  updateStatus: async (userId, status) => {
    return await pool.query("UPDATE public.users SET is_active = $1 WHERE user_id = $2", [status, userId]);
  },

  getHistory: async (userId) => {
    const result = await pool.query("SELECT api.fn_get_user_ride_history($1) as data", [userId]);
    return result.rows[0].data || [];
  },

  getValidCodes: async () => {
    const result = await pool.query("SELECT api.fn_get_available_giftcodes() as data");
    return result.rows[0].data || [];
  },
  sendGift: async (userId, promoCode, title, content) => {
    const result = await pool.query(
      "SELECT api.fn_admin_send_gift_json($1, $2, $3, $4) as data",
      [userId, promoCode, title, content]
    );
    return result.rows[0].data;
  }
};
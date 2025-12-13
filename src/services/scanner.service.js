import { pool } from '../config/db.js';

const scanTicket = async (qr_code, station_code, direction, actor_user_id) => {
  const query = 'SELECT * FROM api.fn_activate_or_use_ticket_json($1, $2, $3, $4, $5)';
  
  // is_auto = false vì đây là quét thủ công
  const { rows } = await pool.query(query, [qr_code, station_code, direction, actor_user_id, false]);
  return rows[0].fn_activate_or_use_ticket_json;
};

export const scannerService = {
  scanTicket,
};
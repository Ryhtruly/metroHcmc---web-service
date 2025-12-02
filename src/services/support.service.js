import { pool } from '../config/db.js';

const sendFeedback = async (userId, title, content) => {
  const query = "SELECT * FROM api.fn_create_feedback_json($1, $2, $3)";
  const result = await pool.query(query, [userId, title, content]);
  return result.rows[0].fn_create_feedback_json;
};

export const supportService = {
  sendFeedback,
};
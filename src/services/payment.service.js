// import { pool } from '../config/db.js';

// const createPayment = async (ticket_id, method, amount) => {
//   const query = 'SELECT * FROM api.fn_create_payment_json($1, $2, $3)';
//   const { rows } = await pool.query(query, [ticket_id, method, amount]);
//   return rows[0].fn_create_payment_json;
// };

// const confirmPayment = async (payment_id) => {
//   const query = 'SELECT * FROM api.fn_confirm_payment_json($1)';
//   const { rows } = await pool.query(query, [payment_id]);
//   return rows[0].fn_confirm_payment_json;
// };

// const getTicketDetails = async (ticket_id) => {
//     const query = 'SELECT * FROM api.fn_get_ticket_json($1)';
//     const { rows } = await pool.query(query, [ticket_id]);
//     return rows[0].fn_get_ticket_json;
//   };

// export const paymentService = {
//   createPayment,
//   confirmPayment,
//   getTicketDetails,
// };
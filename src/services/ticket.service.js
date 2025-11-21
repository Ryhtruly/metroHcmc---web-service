import { pool } from '../config/db.js';

const unwrap = (queryResult, colName) => {
    if (queryResult.rows.length > 0) {
        return queryResult.rows[0][colName];
    }
    return null;
};

const ticketService = {
  getLines: async () => {
    const query = "SELECT * FROM api.fn_get_lines_json()";
    const result = await pool.query(query);
    return unwrap(result, 'fn_get_lines_json');
  },

  getStations: async (lineCode) => {
    const query = "SELECT * FROM api.fn_get_stations_json($1)";
    const result = await pool.query(query, [lineCode]);
    return unwrap(result, 'fn_get_stations_json');
  },

  quoteSingleTicket: async (lineCode, fromStation, toStation, promoCode) => {
    const query = "SELECT * FROM api.fn_quote_single_json($1, $2, $3, $4)";
    const result = await pool.query(query, [lineCode, fromStation, toStation, promoCode]);
    return unwrap(result, 'fn_quote_single_json');
  },

  createSingleTicket: async (userId, lineCode, fromStation, toStation, stops, finalPrice, promoCode) => {
    const query = "SELECT * FROM api.fn_create_ticket_single_json($1, $2, $3, $4, $5, $6, $7)";
    const result = await pool.query(query, [userId, lineCode, fromStation, toStation, stops, finalPrice, promoCode]);
    return unwrap(result, 'fn_create_ticket_single_json');
  },

  createPassTicket: async (userId, productCode, promoCode) => {
    const query = "SELECT * FROM api.fn_create_ticket_pass_json($1, $2, $3)";
    const result = await pool.query(query, [userId, productCode, promoCode]);
    return unwrap(result, 'fn_create_ticket_pass_json');
  },

  getUserTickets: async (userId, statusFilter) => {
    const query = "SELECT * FROM api.fn_get_user_tickets_json($1, $2)";
    const result = await pool.query(query, [userId, statusFilter || null]);
    return unwrap(result, 'fn_get_user_tickets_json');
  },

  getTicketDetail: async (ticketId) => {
    const query = "SELECT * FROM api.fn_get_ticket_json($1)";
    const result = await pool.query(query, [ticketId]);
    return unwrap(result, 'fn_get_ticket_json');
  }
};

export default ticketService;
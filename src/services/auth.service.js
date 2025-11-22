import { pool } from '../config/db.js';


const register = async (email, password, displayName) => {
  const query = 'SELECT * FROM api.fn_auth_register_json($1, $2, $3)';
  const { rows } = await pool.query(query, [email, password, displayName]);
  return rows[0].fn_auth_register_json;
};

const login = async (email, password) => {
  const query = 'SELECT * FROM api.fn_auth_login_json($1, $2, $3, $4)';
  const { rows } = await pool.query(query, ['LOCAL', email, password, null]);
  return rows[0].fn_auth_login_json;
};

const getAnnouncements = async () => {
  const query = 'SELECT * FROM api.fn_get_announcements_json()';
  const { rows } = await pool.query(query);
  return rows[0].fn_get_announcements_json;
};

const forgotPassword = async (email) => {
  const query = 'SELECT * FROM api.fn_auth_forgot_password_json($1)';
  const { rows } = await pool.query(query, [email]);
  return rows[0].fn_auth_forgot_password_json;
};

const resetPassword = async (token, newPassword) => {
  const query = 'SELECT * FROM api.fn_auth_reset_password_json($1, $2)';
  const { rows } = await pool.query(query, [token, newPassword]);
  return rows[0].fn_auth_reset_password_json;
};

export const authService = {
  register,
  login,
  getAnnouncements,
  forgotPassword,
  resetPassword,
};;
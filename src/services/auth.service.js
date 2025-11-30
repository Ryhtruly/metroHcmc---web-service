import { pool } from '../config/db.js';

// 1. Đăng ký
const register = async (email, password, displayName) => {
  const query = 'SELECT * FROM fn_auth_register_json($1, $2, $3)';
  const { rows } = await pool.query(query, [email, password, displayName]);
  return rows[0].fn_auth_register_json;
};

// 2. Đăng nhập
const login = async (email, password) => {
  const query = 'SELECT * FROM fn_auth_login_json($1, $2, $3, $4)';
  const { rows } = await pool.query(query, ['LOCAL', email, password, null]);
  return rows[0].fn_auth_login_json;
};

// 3. Lấy thông báo công khai
const getAnnouncements = async () => {
  const query = 'SELECT * FROM api.fn_get_announcements_json()';
  const { rows } = await pool.query(query);
  return rows[0].fn_get_announcements_json;
};

// 4. Quên mật khẩu (Tạo token reset)
const forgotPassword = async (email) => {
  const query = 'SELECT * FROM api.fn_auth_forgot_password_json($1)';
  const { rows } = await pool.query(query, [email]);
  return rows[0].fn_auth_forgot_password_json;
};

// 5. Đặt lại mật khẩu (Dùng token để đổi pass mới)
const resetPassword = async (token, newPassword) => {
  const query = 'SELECT * FROM api.fn_auth_reset_password_json($1, $2)';
  const { rows } = await pool.query(query, [token, newPassword]);
  return rows[0].fn_auth_reset_password_json;
};
// 6.Thay đổi displayname
const updateDisplayName = async (userId, displayName) => {
  const query = `
    UPDATE users
    SET 
      display_name = $2,
      updated_at   = NOW()
    WHERE user_id = $1
    RETURNING 
      user_id,
      display_name,
      avatar_url,
      primary_email,
      email_verified,
      role,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(query, [userId, displayName]);

  if (!rows.length) {
    return {
      success: false,
      message: 'User not found',
    };
  }

  return {
    success: true,
    user: rows[0],
  };
};


export const authService = {
  register,
  login,
  getAnnouncements,
  updateDisplayName,
  forgotPassword,
  resetPassword,
};
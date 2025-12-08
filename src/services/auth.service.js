import { pool } from '../config/db.js';

const register = async (email, password, display_name, phone_number, address, cccd, birth_date) => {
  try {
    // Xử lý birth_date nếu có
    let processedBirthDate = null;
    if (birth_date && birth_date.trim() !== '') {
      try {
        // Đảm bảo birth_date là kiểu Date cho PostgreSQL
        processedBirthDate = new Date(birth_date);
        // Validate ngày hợp lệ
        if (isNaN(processedBirthDate.getTime())) {
          return {
            success: false,
            error_code: 'INVALID_BIRTH_DATE',
            message: 'Ngày sinh không hợp lệ'
          };
        }
      } catch (error) {
        return {
          success: false,
          error_code: 'INVALID_BIRTH_DATE',
          message: 'Định dạng ngày sinh không hợp lệ'
        };
      }
    }

    const query = 'SELECT * FROM api.fn_auth_register_json($1, $2, $3, $4, $5, $6, $7)';
    const { rows } = await pool.query(query, [
      email,
      password,
      display_name,
      phone_number || null,
      address || null,
      cccd || null,
      processedBirthDate
    ]);

    return rows[0].fn_auth_register_json;
  } catch (err) {
    console.error('Service registration error:', err);
    return {
      success: false,
      error_code: 'REGISTRATION_ERROR',
      message: err.message
    };
  }
};

// 2. Đăng nhập
const login = async (email, password) => {
  const query = 'SELECT * FROM api.fn_auth_login_json($1, $2, $3, $4)';
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
const resetPassword = async (token, oldPassword, newPassword) => {
  try {
    const query = 'SELECT api.change_password_with_token($1, $2, $3)';
    await pool.query(query, [token, oldPassword, newPassword]);

    return { success: true, message: 'Đổi mật khẩu thành công' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// 6.Update profile
const updateUserProfile = async (userId, display_name, phone_number, address, cccd, birth_date) => {
  try {
    // Kiểm tra nếu birth_date là string rỗng thì set thành null
    if (birth_date === '' || birth_date === null || birth_date === undefined) {
      birth_date = null;
    }

    // Gọi stored procedure
    const result = await pool.query(
      'SELECT api.update_user_profile($1, $2, $3, $4, $5, $6)',
      [userId, display_name, phone_number, address, cccd, birth_date]
    );

    return result.rows[0].update_user_profile;
  } catch (error) {
    console.error('Error in updateUserProfile service:', error);
    return {
      success: false,
      message: error.message || 'Database error'
    };
  }
};

export const authService = {
  register,
  login,
  getAnnouncements,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};
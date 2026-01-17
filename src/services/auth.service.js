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

// File: src/services/auth.service.js
// File: src/services/auth.service.js
const login = async (email, password) => {
  try {
    // 1. Gọi đúng hàm Stored Procedure trong Schema 'api'
    // Tham số: provider, email, password, user_agent
    const query = 'SELECT api.fn_auth_login_json($1, $2, $3, $4) as result';
    const { rows } = await pool.query(query, ['LOCAL', email, password, null]);

    // 2. Trả về kết quả JSON mà hàm SQL trả ra
    return rows[0].result; 
  } catch (err) {
    console.error('Lỗi Login Service:', err.message);
    return { success: false, message: 'Lỗi kết nối cơ sở dữ liệu' };
  }
};

// 3. Lấy thông báo công khai
const getAnnouncements = async () => {
  const query = 'SELECT * FROM api.fn_get_announcements_json()';
  const { rows } = await pool.query(query);
  return rows[0].fn_get_announcements_json;
};

// 4. Quên mật khẩu
const forgotPassword = async (email) => {
  try {
    const query = 'SELECT * FROM api.fn_auth_forgot_password_json($1)';
    const { rows } = await pool.query(query, [email]);
    // Trả về object JSON trực tiếp
    return rows[0].fn_auth_forgot_password_json;
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Lỗi Database' };
  }
};
// const forgotPasswordMobile = async (email) => {
//   const query = 'SELECT * FROM api.fn_auth_forgot_password_mobile_json($1)';
//   const { rows } = await pool.query(query, [email]);
//   return rows[0].fn_auth_forgot_password_mobile_json;
// };

// const resetPassword = async (token, newPassword) => {
//   try {
//     const query = 'SELECT * FROM api.fn_auth_reset_password_via_token_json($1, $2)';
//     const { rows } = await pool.query(query, [token, newPassword]);
//     return rows[0].fn_auth_reset_password_via_token_json;
//   } catch (err) {
//     console.error(err);
//     return { success: false, message: 'Lỗi Database' };
//   }
// };
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

const enableBiometric = async (userId, biometricToken) => {
  const query = `
    UPDATE users 
    SET biometric_token = $1, is_biometric_enabled = true 
    WHERE user_id = $2 
    RETURNING user_id`;
  const { rows } = await pool.query(query, [biometricToken, userId]);
  return rows.length > 0;
};

// src/services/auth.service.js
export const loginWithBiometric = async (biometricToken) => {
  // Tên hàm SQL của bạn: api.fn_auth_login_biometric_json
  // Ta dùng alias 'AS result' để dễ lấy dữ liệu
  const query = `SELECT api.fn_auth_login_biometric_json($1) AS result`;
  const { rows } = await pool.query(query, [biometricToken]);
  
  // rows[0].result chính là cái JSON { success, token, user } mà SQL trả về
  return rows[0].result; 
};

const getNotifications = async (userId) => {
  try {
    const result = await pool.query(
      "SELECT api.fn_get_user_notifications_json($1) as data",
      [userId]
    );
    return result.rows[0].data || [];
  } catch (error) {
    console.error('Error in getNotifications service:', error);
    return [];
  }
};

export const authService = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateUserProfile,
  enableBiometric,   
  loginWithBiometric,
  getAnnouncements,
  getNotifications
};
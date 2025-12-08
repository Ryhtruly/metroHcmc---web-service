import { pool } from '../config/db.js';

// ==========================================================
// HÀM 1: XÁC THỰC & GIA HẠN TOKEN
// ==========================================================
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Lấy token từ header
      token = req.headers.authorization.split(' ')[1];

      // 2. Gọi hàm DB để kiểm tra tính hợp lệ của token
      const query = 'SELECT * FROM api.fn_auth_get_me_json($1)';
      const { rows } = await pool.query(query, [token]);

      const dbResponse = rows[0].fn_auth_get_me_json;

      if (dbResponse.success) {
        // 3. Gắn thông tin user vào request để các hàm sau sử dụng
        req.user = dbResponse.user;

        // --- 🔥 TÍNH NĂNG MỚI: TỰ ĐỘNG GIA HẠN (Sliding Expiration) ---
        // Nếu token còn sống, tự động cộng thêm 10 phút kể từ bây giờ
        // Giúp người dùng đang thao tác không bị logout giữa chừng
        await pool.query(
          `UPDATE auth_tokens 
             SET expires_at = NOW() + INTERVAL '10 minutes' 
             WHERE token = $1`,
          [token]
        );
        // -------------------------------------------------------------

        next(); // Cho phép đi tiếp
      } else {
        // Token hết hạn hoặc không tồn tại trong DB
        res.status(401).json({ success: false, message: dbResponse.message });
      }
    } catch (err) {
      console.error('Lỗi Auth Middleware:', err.message);
      res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Chưa cung cấp Token' });
  }
};

// ==========================================================
// HÀM 2: PHÂN QUYỀN (AUTHORIZATION)
// ==========================================================

// Chỉ cho phép ADMIN
export const adminOnly = (req, res, next) => {
  // req.user đã được hàm 'protect' gắn vào trước đó
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Yêu cầu quyền Admin'
    });
  }
};

// Chỉ cho phép INSPECTOR (Nhân viên soát vé)
export const inspectorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'INSPECTOR') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Yêu cầu quyền Inspector'
    });
  }
};

// Chỉ cho phép CUSTOMER (Khách hàng)
export const customerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Yêu cầu quyền Customer'
    });
  }
};
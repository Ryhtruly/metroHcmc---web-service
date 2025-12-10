import { authService } from '../services/auth.service.js';

const registerUser = async (req, res) => {
  try {
    const {
      email,
      password,
      display_name,
      phone_number,
      address,
      cccd,
      birth_date
    } = req.body;

    // Log để debug
    console.log('Register request data:', req.body);

    // Validate bắt buộc
    if (!email || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error_code: 'MISSING_REQUIRED_FIELDS',
        message: 'Email, mật khẩu và họ tên là bắt buộc'
      });
    }

    const dbResponse = await authService.register(
      email,
      password,
      display_name,
      phone_number,
      address,
      cccd,
      birth_date
    );

    if (dbResponse.success) {
      // Set cookie hoặc header nếu cần
      res.status(201).json(dbResponse);
    } else {
      res.status(400).json(dbResponse);
    }
  } catch (err) {
    console.error('Controller registration error:', err);
    res.status(500).json({
      success: false,
      error_code: 'SERVER_ERROR',
      message: 'Lỗi server khi đăng ký'
    });
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const dbResponse = await authService.login(email, password);

    if (dbResponse.success) {
      res.status(200).json(dbResponse); // Đăng nhập thành công
    } else {
      // Sai mật khẩu/Tài khoản khóa -> Trả về 200 để Frontend hiện lỗi (Thay vì 401)
      res.status(401).json({
        success: false,
        message: dbResponse.message || 'Tài khoản hoặc mật khẩu không đúng'
      });
    }
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    // Lỗi hệ thống -> Vẫn trả 200 để không bị reload trang
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi kết nối Server' 
    });
  }
};

const getMe = async (req, res) => {
  // req.user đã được middleware 'protect' gán vào
  res.status(200).json({ success: true, user: req.user });
};

const getPublicAnnouncements = async (req, res) => {
  try {
    const dbResponse = await authService.getAnnouncements();
    res.status(200).json(dbResponse);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Controller updateMe
const updateMe = async (req, res) => {
  try {
    const userId = req.user.user_id; // đã có từ middleware protect
    const { display_name, phone_number, address, cccd, birth_date } = req.body;

    // Kiểm tra xem tên hiển thị có hợp lệ không
    if (display_name && !display_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên hiển thị không được để trống',
      });
    }

    // Gọi service để cập nhật thông tin người dùng
    const dbResponse = await authService.updateUserProfile(
      userId,
      display_name?.trim(),
      phone_number?.trim(),
      address?.trim(),
      cccd?.trim(),
      birth_date
    );

    if (!dbResponse.success) {
      return res.status(400).json(dbResponse);
    }

    return res.status(200).json(dbResponse); // { success: true, user: {...} }
  } catch (err) {
    console.error('updateMe error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // Gọi service (Service này gọi hàm api.fn_auth_forgot_password_json trong DB)
    const dbResponse = await authService.forgotPassword(email);

    if (dbResponse.success) {
      // 🔥 LOG TOKEN RA TERMINAL 🔥
      console.log("\n=================================================");
      console.log("🔥 [DEBUG] RESET TOKEN CHO:", email);
      console.log("🔑 TOKEN:", dbResponse.reset_token);
      console.log("=================================================\n");

      res.status(200).json({ 
        success: true, 
        message: 'Yêu cầu thành công! Kiểm tra Terminal Server để lấy Token.' 
      });
    } else {
      res.status(401).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: "Thiếu Token hoặc Mật khẩu mới" });
    }

    // Gọi service (Service này gọi hàm api.fn_auth_reset_password_via_token_json)
    const dbResponse = await authService.resetPassword(token, new_password);

    if (dbResponse.success) {
      res.status(200).json(dbResponse);
    } else {
      res.status(400).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const authController = {
  registerUser,
  loginUser,
  getMe,
  getPublicAnnouncements,
  forgotPassword, // Mới
  resetPassword,  // Mới
  updateMe,
};
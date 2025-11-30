import { authService } from '../services/auth.service.js';

const registerUser = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const dbResponse = await authService.register(email, password, displayName);

    if (dbResponse.success) {
      res.status(201).json(dbResponse);
    } else {
      res.status(400).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const dbResponse = await authService.login(email, password);

    if (dbResponse.success) {
      res.status(200).json(dbResponse);
    } else {
      res.status(401).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
const updateMe = async (req, res) => {
  try {
    const userId = req.user.user_id; // đã có từ middleware protect
    const { display_name } = req.body; // hoặc displayName tuỳ bạn

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên hiển thị không được để trống',
      });
    }

    const dbResponse = await authService.updateDisplayName(
      userId,
      display_name.trim()
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

// --- 👇 Chức năng Quên mật khẩu & Reset mật khẩu 👇 ---

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const dbResponse = await authService.forgotPassword(email);

    if (dbResponse.success) {
      // Demo: trả về thẳng mật khẩu tạm & token
      res.status(200).json(dbResponse);
    } else {
      res.status(400).json(dbResponse);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;
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
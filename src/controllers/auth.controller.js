
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


export const authController = {
  registerUser,
  loginUser,
  getMe,
  getPublicAnnouncements,
};
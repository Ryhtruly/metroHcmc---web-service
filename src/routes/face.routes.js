import express from 'express';
import multer from 'multer';
import { registerFace, loginFace } from '../controllers/faceAuth.controller.js';

const router = express.Router();

// Cấu hình Multer để lưu ảnh vào RAM (xử lý cho nhanh, không cần lưu xuống đĩa)
const upload = multer({ storage: multer.memoryStorage() });

// --- CÁC ROUTE API ---

// 1. Đăng ký khuôn mặt
router.post('/register-face', upload.array('face_images', 3), registerFace);

// 2. Đăng nhập bằng khuôn mặt
router.post('/login-face', upload.single('face_image'), loginFace);

export default router;
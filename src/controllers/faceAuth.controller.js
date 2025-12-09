import faceapi from '../config/faceAI.js';
import canvas from 'canvas';
import { pool } from '../config/db.js';

const { Canvas, Image } = canvas;

// Hàm load ảnh cho thư viện gốc
const bufferToImage = async (buffer) => {
  const img = new Image();
  img.src = buffer;
  return img;
};

// Hàm cộng gộp 2 mảng số (Hỗ trợ tính trung bình)
const sumDescriptors = (desc1, desc2) => {
  return desc1.map((val, i) => val + desc2[i]);
};

// ==========================================
// 1. ĐĂNG KÝ (NÂNG CẤP: Xử lý 3 ảnh)
// ==========================================
export const registerFace = async (req, res) => {
  try {
    const { user_id } = req.body;
    const files = req.files; // Lưu ý: req.files (số nhiều)

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa gửi ảnh' });
    }

    console.log(`📸 Backend nhận được ${files.length} ảnh để đăng ký...`);

    let totalDescriptor = new Float32Array(128).fill(0); // Mảng chứa tổng
    let validFaces = 0;

    // Duyệt qua từng ảnh gửi lên (Thẳng, Trái, Phải)
    for (const file of files) {
      const img = await bufferToImage(file.buffer);
      // Dùng SSD MobileNet để tìm mặt nhanh và chính xác
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        totalDescriptor = sumDescriptors(totalDescriptor, detection.descriptor);
        validFaces++;
      }
    }

    if (validFaces === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy khuôn mặt rõ nét nào. Vui lòng thử lại.' });
    }

    // Tính trung bình cộng (Average Descriptor) để tạo ra dữ liệu khuôn mặt tổng quát nhất
    const avgDescriptor = totalDescriptor.map(val => val / validFaces);

    // Lưu vào DB
    const query = `UPDATE users SET face_descriptor = $1 WHERE user_id = $2 RETURNING user_id`;
    await pool.query(query, [JSON.stringify(Array.from(avgDescriptor)), user_id]);

    res.json({ success: true, message: `Đăng ký thành công! Đã tổng hợp dữ liệu từ ${validFaces} góc mặt.` });

  } catch (error) {
    console.error('❌ Lỗi Register Face:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. ĐĂNG NHẬP (Giữ nguyên logic 1 ảnh)
// ==========================================
export const loginFace = async (req, res) => {
  try {
    const { email } = req.body;
    const file = req.file;

    if (!file || !email) return res.status(400).json({ success: false, message: 'Thiếu ảnh hoặc email' });

    // 1. Lấy dữ liệu khuôn mặt gốc từ DB
    const query = `SELECT user_id, face_descriptor, role, display_name FROM users WHERE primary_email = $1`;
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0 || !rows[0].face_descriptor) {
      return res.status(404).json({ success: false, message: 'Tài khoản chưa đăng ký khuôn mặt' });
    }

    const savedDescriptor = new Float32Array(JSON.parse(rows[0].face_descriptor));

    // 2. Đọc ảnh mới gửi lên
    const img = await bufferToImage(file.buffer);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy khuôn mặt. Hãy giữ yên camera.' });
    }

    // 3. So sánh khoảng cách Euclidean
    const distance = faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
    console.log(`🔍 Độ sai lệch: ${distance.toFixed(4)}`); // < 0.5 là giống

    // Ngưỡng 0.5 là khá an toàn. Nếu khó login quá có thể tăng lên 0.55
    if (distance < 0.5) {
      res.json({ 
        success: true, 
        message: 'Xác thực thành công!', 
        user: rows[0],
        similarity: distance 
      });
    } else {
      res.status(401).json({ success: false, message: 'Khuôn mặt không khớp', similarity: distance });
    }

  } catch (error) {
    console.error('❌ Lỗi Login Face:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
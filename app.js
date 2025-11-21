import express from 'express';
import cors from 'cors';

// 1. Kết nối DB (Đúng: ./src/config/db.js)
import './src/config/db.js';

// 2. Import Routes
// SỬA LỖI: Đổi '.src' thành './src'
import authRoutes from './src/routes/auth.routes.js';       
import paymentRoutes from './src/routes/payment.routes.js';
import scannerRoutes from './src/routes/scanner.routes.js'; 

// 3. Import Batch Service
// SỬA LỖI: Thêm 'src/' vào đường dẫn
import { startBatchJobs } from './src/services/batch.service.js';

const app = express();

app.use(cors());
app.use(express.json()); // Quan trọng: Để đọc được JSON từ body request
app.use(express.urlencoded({ extended: true })); 

// 4. Đăng ký Routes
app.use('/api/auth', authRoutes);          
app.use('/api/payments', paymentRoutes);   
app.use('/api/scanner', scannerRoutes);    

// 5. Khởi động Batch Jobs
startBatchJobs();

// Route kiểm tra server sống hay chết
app.get('/', (req, res) => {
  res.send('🚀 Metro Web Service is running...');
});

// Middleware xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal Server Error', 
    error: err.message 
  });
});

export default app;
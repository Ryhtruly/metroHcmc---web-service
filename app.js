import express from 'express';
import cors from 'cors';

// 1. Kết nối DB
import './src/config/db.js';

// 2. Import Routes
import authRoutes from './src/routes/auth.routes.js';
// import paymentRoutes from './src/routes/payment.routes.js';
import scannerRoutes from './src/routes/scanner.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import ticketRoutes from './src/routes/ticket.routes.js';
import supportRoutes from './src/routes/support.routes.js';
import { startBatchJobs } from './src/services/batch.service.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Đăng ký Routes
app.use('/api/auth', authRoutes);
// app.use('/api/payments', paymentRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/support', supportRoutes);

// 5. Khởi động Batch Jobs
startBatchJobs();

// Route kiểm tra
app.get('/', (req, res) => {
  res.send('🚀 Metro Web Service is running...');
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

export default app;
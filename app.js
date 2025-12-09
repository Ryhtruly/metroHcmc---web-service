import express from 'express';
import cors from 'cors';

// gen swagger api
import { swaggerDocs } from "./src/docs/swagger.js";

// 1. Kết nối DB
import './src/config/db.js';

// 2. Import Routes
import authRoutes from './src/routes/auth.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import scannerRoutes from './src/routes/scanner.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import ticketRoutes from './src/routes/ticket.routes.js';
import promoRoutes from './src/routes/promo.routes.js';
import supportRoutes from './src/routes/support.routes.js';
import { startBatchJobs } from './src/services/batch.service.js';
import { loadModels } from './src/config/faceAI.js';
import faceRoutes from './src/routes/face.routes.js';

const app = express();

// swagger
swaggerDocs(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Đăng ký Đường dẫn Cơ sở
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/giftcodes', promoRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/auth', faceRoutes);

// 5. Khởi động Batch Jobs
startBatchJobs();

// Route kiểm tra
app.get('/', (req, res) => {
  res.send('🚀 Metro Web Service is running...');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Service is healthy' });
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
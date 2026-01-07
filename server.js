import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Web Service (Máy 3) đang chạy tại http://localhost:${PORT}`);
      console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("❌ Không thể khởi động Server:", error);
  }
};

startServer();
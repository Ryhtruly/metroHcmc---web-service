import 'dotenv/config';
import app from './app.js';
import { loadModels } from './src/config/faceAI.js'; // <--- 1. Thêm dòng này

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 2. Nạp "bộ não" AI trước
    await loadModels(); 

    // 3. Sau đó mới mở cổng Server
    app.listen(PORT, () => {
      console.log(`🚀 Web Service (Máy 3) đang chạy tại http://localhost:${PORT}`);
      console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("❌ Không thể khởi động Server:", error);
  }
};

startServer();
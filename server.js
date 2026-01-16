import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Thêm '0.0.0.0' làm tham số thứ 2
    app.listen(PORT, () => {
      console.log(
        `🚀 Web Service (Máy 3) đang lắng nghe trên tất cả các IP tại port ${PORT}`
      );
      console.log(
        `📡 Truy cập từ máy khác: http://<IP_LAN_CUA_MAY_NAY>:${PORT}`
      );
      console.log(`📚 Swagger UI (Local): http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("❌ Không thể khởi động Server:", error);
  }
};

startServer();

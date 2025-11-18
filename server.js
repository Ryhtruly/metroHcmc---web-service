
import 'dotenv/config'; // Import trước
import app from './app.js'; // Import app

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Web Service (Máy 3) đang chạy tại http://localhost:${PORT}`);
});
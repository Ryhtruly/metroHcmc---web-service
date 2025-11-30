import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web Service (Máy 3) đang chạy tại http://localhost:${PORT}/api`);
});
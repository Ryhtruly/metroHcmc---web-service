import 'dotenv/config'; 
import app from './app.js'; 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Web Service (Máy 3) đang chạy tại http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
// Import thư viện gốc
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

// Cấu hình môi trường Node.js (Bắt buộc)
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsPath = path.join(__dirname, '../models');

export const loadModels = async () => {
  try {
    console.log('⏳ Đang tải Model AI từ:', modelsPath);
    
    // Load model (Không cần backend CPU phức tạp)
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath) 
    ]);

    console.log('✅ Đã tải xong Model AI! (Phiên bản gốc ổn định)');
  } catch (error) {
    console.error('❌ Lỗi tải Model AI:', error);
  }
};

export default faceapi;
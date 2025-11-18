import express from 'express';
import cors from 'cors';
import './src/config/db.js';

import authRoutes from './src/routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Chào mừng đến với Metro Web Service (Máy 3)');
});

app.use('/api/auth', authRoutes);

export default app; 
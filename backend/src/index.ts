import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import examRoutes from './routes/examRoutes';
import attemptRoutes from './routes/attemptRoutes';
import teacherRoutes from './routes/teacherRoutes';
import studentRoutes from './routes/studentRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// Railway อยู่หลัง reverse proxy — ต้องเปิดก่อน express-rate-limit ไม่งั้นได้ ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '8mb' }));

// โหมดพัฒนาผ่อนจำกัดมาก — กันติด 429 ตอนทดสอบเข้าสู่ระบบซ้ำ
const isDev = config.nodeEnv !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 800,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่' },
  skip: (req) => isDev && req.path === '/health',
});
app.use('/api', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
});

export default app;

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';
import streakRoutes from './routes/streak';
import replyRoutes from './routes/reply';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:5173'],
  credentials: true,
}));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// Routes
app.use('/auth', authRoutes);
app.use('/ai', aiRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/streak', streakRoutes);
app.use('/reply', replyRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`🚀 XBoost AI Server running on port ${PORT}`);
});

export default app;

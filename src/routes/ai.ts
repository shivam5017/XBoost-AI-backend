import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateReply,
  analyzeTweet,
  createTweet,
  rewriteTweet,
  markPosted,
  getTemplates,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI rate limit exceeded. Please wait a minute.' },
  skip: (req) => req.method === 'OPTIONS',
});

const router = Router();
router.use(authenticate);

router.get('/templates',     getTemplates);          // no rate limit — just data
router.post('/reply',        aiLimiter, generateReply);
router.post('/analyze',      aiLimiter, analyzeTweet);
router.post('/create',       aiLimiter, createTweet);
router.post('/rewrite',      aiLimiter, rewriteTweet);
router.post('/mark-posted',  markPosted);

export default router;
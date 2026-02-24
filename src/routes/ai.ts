import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generateReply, analyzeTweet, createTweet, rewriteTweet, markPosted } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'AI rate limit exceeded' } });

const router = Router();
router.use(authenticate);
router.use(aiLimiter);
router.post('/reply', generateReply);
router.post('/analyze', analyzeTweet);
router.post('/create', createTweet);
router.post('/rewrite', rewriteTweet);
router.post('/mark-posted', markPosted);
export default router;

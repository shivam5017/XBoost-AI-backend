import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateReply,
  analyzeTweet,
  createTweet,
  rewriteTweet,
  markPosted,
  getTemplates,
  getTemplatesCatalog,
  viralHookIntel,
  preLaunchOptimize,
  trendRadar,
  growthStrategist,
  brandAnalyzer,
  threadWriterPro,
  leadMagnet,
  audiencePsychology,
  repurposeContent,
  monetizationToolkit,
  viralScore,
  bestTimePost,
  contentPredict,
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

router.get('/templates',     getTemplates);          
router.get('/templates/catalog', getTemplatesCatalog);
router.post('/reply',        aiLimiter, generateReply);
router.post('/analyze',      aiLimiter, analyzeTweet);
router.post('/create',       aiLimiter, createTweet);
router.post('/rewrite',      aiLimiter, rewriteTweet);
router.post('/mark-posted',  markPosted);
router.post('/viral-hook-intel', aiLimiter, viralHookIntel);
router.post('/prelaunch-optimize', aiLimiter, preLaunchOptimize);
router.post('/trend-radar', aiLimiter, trendRadar);
router.post('/growth-strategist', aiLimiter, growthStrategist);
router.post('/brand-analyzer', aiLimiter, brandAnalyzer);
router.post('/thread-pro', aiLimiter, threadWriterPro);
router.post('/lead-magnet', aiLimiter, leadMagnet);
router.post('/audience-psychology', aiLimiter, audiencePsychology);
router.post('/repurpose', aiLimiter, repurposeContent);
router.post('/monetization-toolkit', aiLimiter, monetizationToolkit);
router.post('/viral-score', aiLimiter, viralScore);
router.post('/best-time-post', aiLimiter, bestTimePost);
router.post('/content-predict', aiLimiter, contentPredict);

export default router;

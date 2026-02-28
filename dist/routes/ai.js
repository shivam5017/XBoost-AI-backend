"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ai_controller_1 = require("../controllers/ai.controller");
const auth_1 = require("../middleware/auth");
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'AI rate limit exceeded. Please wait a minute.' },
    skip: (req) => req.method === 'OPTIONS',
});
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/templates', ai_controller_1.getTemplates); // no rate limit — just data
router.post('/reply', aiLimiter, ai_controller_1.generateReply);
router.post('/analyze', aiLimiter, ai_controller_1.analyzeTweet);
router.post('/create', aiLimiter, ai_controller_1.createTweet);
router.post('/rewrite', aiLimiter, ai_controller_1.rewriteTweet);
router.post('/mark-posted', ai_controller_1.markPosted);
router.post('/viral-hook-intel', aiLimiter, ai_controller_1.viralHookIntel);
router.post('/prelaunch-optimize', aiLimiter, ai_controller_1.preLaunchOptimize);
router.post('/trend-radar', aiLimiter, ai_controller_1.trendRadar);
router.post('/growth-strategist', aiLimiter, ai_controller_1.growthStrategist);
router.post('/brand-analyzer', aiLimiter, ai_controller_1.brandAnalyzer);
router.post('/thread-pro', aiLimiter, ai_controller_1.threadWriterPro);
router.post('/lead-magnet', aiLimiter, ai_controller_1.leadMagnet);
router.post('/audience-psychology', aiLimiter, ai_controller_1.audiencePsychology);
router.post('/repurpose', aiLimiter, ai_controller_1.repurposeContent);
router.post('/monetization-toolkit', aiLimiter, ai_controller_1.monetizationToolkit);
router.post('/viral-score', aiLimiter, ai_controller_1.viralScore);
router.post('/best-time-post', aiLimiter, ai_controller_1.bestTimePost);
router.post('/content-predict', aiLimiter, ai_controller_1.contentPredict);
exports.default = router;

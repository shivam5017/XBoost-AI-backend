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
exports.default = router;

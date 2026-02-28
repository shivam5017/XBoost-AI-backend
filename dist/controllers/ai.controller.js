"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReply = generateReply;
exports.analyzeTweet = analyzeTweet;
exports.createTweet = createTweet;
exports.rewriteTweet = rewriteTweet;
exports.markPosted = markPosted;
exports.getTemplates = getTemplates;
exports.viralHookIntel = viralHookIntel;
exports.preLaunchOptimize = preLaunchOptimize;
exports.viralScore = viralScore;
exports.bestTimePost = bestTimePost;
exports.contentPredict = contentPredict;
exports.trendRadar = trendRadar;
exports.growthStrategist = growthStrategist;
exports.brandAnalyzer = brandAnalyzer;
exports.threadWriterPro = threadWriterPro;
exports.leadMagnet = leadMagnet;
exports.audiencePsychology = audiencePsychology;
exports.repurposeContent = repurposeContent;
exports.monetizationToolkit = monetizationToolkit;
const db_1 = require("../lib/db");
const AIService = __importStar(require("../services/ai.service"));
const usage_service_1 = require("../services/usage.service");
const timezone_1 = require("../utils/timezone");
const apikey_service_1 = require("../services/apikey.service");
const billing_service_1 = require("../services/billing.service");
async function getUserApiKey(userId) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { openaiKey: true },
    });
    if (!user?.openaiKey)
        return null;
    return ((0, apikey_service_1.getProviderApiKey)(user.openaiKey, "openai") ||
        (0, apikey_service_1.getProviderApiKey)(user.openaiKey, "chatgpt") ||
        null);
}
async function trackUsage(userId, endpoint, tokens) {
    await db_1.prisma.aIUsage.create({ data: { userId, endpoint, tokens } });
}
async function requireFeature(req, res, featureId) {
    const allowed = await (0, billing_service_1.hasFeatureAccess)(req.userId, featureId);
    if (!allowed) {
        res.status(402).json({
            error: "Feature locked for current plan. Upgrade required.",
            code: "FEATURE_LOCKED",
            featureId,
        });
        return false;
    }
    return true;
}
async function bestPostingHoursForUser(userId) {
    const usage = await db_1.prisma.aIUsage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { createdAt: true },
    });
    if (!usage.length)
        return [9, 13, 18];
    const counts = new Array(24).fill(0);
    for (const item of usage)
        counts[item.createdAt.getUTCHours()] += 1;
    return counts
        .map((count, hour) => ({ count, hour }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((x) => x.hour)
        .sort((a, b) => a - b);
}
async function updateDailyStats(userId, increment, timeZone = "UTC") {
    const today = (0, timezone_1.startOfDayUtcForTimezone)(new Date(), timeZone);
    await db_1.prisma.dailyStats.upsert({
        where: { userId_date: { userId, date: today } },
        create: {
            userId,
            date: today,
            repliesGenerated: increment === 'generated' ? 1 : 0,
            repliesPosted: increment === 'posted' ? 1 : 0,
            estimatedImpressions: increment === 'posted' ? Math.floor(Math.random() * 200 + 50) : 0,
        },
        update: {
            repliesGenerated: increment === 'generated' ? { increment: 1 } : undefined,
            repliesPosted: increment === 'posted' ? { increment: 1 } : undefined,
            estimatedImpressions: increment === 'posted'
                ? { increment: Math.floor(Math.random() * 200 + 50) }
                : undefined,
        },
    });
}
// ── POST /ai/reply ────────────────────────────────────────────────────────────
// ── POST /ai/reply ────────────────────────────────────────────────────────────
async function generateReply(req, res) {
    const { tweetText, tone = 'smart', tweetId, wordCount = 50, templateId } = req.body;
    if (!tweetText) {
        res.status(400).json({ error: 'tweetText required' });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    let reply;
    let tokens;
    try {
        ({ reply, tokens } = await AIService.generateReply(tweetText, tone, userApiKey, wordCount, templateId));
    }
    catch (err) {
        console.error('[/ai/reply] AIService error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to generate reply' });
        return;
    }
    const timeZone = (0, timezone_1.readTimezoneFromRequest)(req);
    const quota = await (0, usage_service_1.consumeDailyReplyQuota)(req.userId, 1, timeZone);
    if (!quota.allowed) {
        res.status(402).json({
            error: 'Daily reply limit reached. Upgrade to Starter or Pro to continue.',
            code: 'USAGE_LIMIT_EXCEEDED',
            usage: {
                planId: quota.planId,
                used: quota.used,
                limit: quota.limit,
                remaining: quota.remaining,
            },
        });
        return;
    }
    // ✅ Await the reply creation to get its id, fire the rest async
    let replyId = null;
    try {
        const [, createdReply] = await Promise.all([
            trackUsage(req.userId, '/ai/reply', tokens),
            db_1.prisma.reply.create({
                data: { userId: req.userId, tweetId: tweetId ?? null, tweetText, replyText: reply, tone },
            }),
        ]);
        replyId = createdReply.id;
        updateDailyStats(req.userId, 'generated', timeZone).catch((dbErr) => {
            console.error('[/ai/reply] dailyStats error (non-fatal):', dbErr.message);
        });
    }
    catch (dbErr) {
        console.error('[/ai/reply] DB write error (non-fatal):', dbErr.message);
    }
    res.json({ reply, tone, replyId });
}
// ── POST /ai/analyze ──────────────────────────────────────────────────────────
async function analyzeTweet(req, res) {
    const { tweetText } = req.body;
    if (!tweetText) {
        res.status(400).json({ error: 'tweetText required' });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    let analysis;
    let tokens;
    try {
        ({ analysis, tokens } = await AIService.analyzeTweet(tweetText, userApiKey));
    }
    catch (err) {
        console.error('[/ai/analyze] AIService error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to analyze tweet' });
        return;
    }
    trackUsage(req.userId, '/ai/analyze', tokens).catch((dbErr) => {
        console.error('[/ai/analyze] DB write error (non-fatal):', dbErr.message);
    });
    res.json(analysis);
}
// ── POST /ai/create ───────────────────────────────────────────────────────────
// ── POST /ai/create ───────────────────────────────────────────────────────────
async function createTweet(req, res) {
    const { topic, tone = 'smart', wordCount = 50, templateId } = req.body;
    if (!topic) {
        res.status(400).json({ error: 'topic required' });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    let tweet;
    let tokens;
    try {
        ({ tweet, tokens } = await AIService.createTweet(topic, tone, userApiKey, wordCount, templateId));
    }
    catch (err) {
        console.error('[/ai/create] AIService error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to create tweet' });
        return;
    }
    const timeZone = (0, timezone_1.readTimezoneFromRequest)(req);
    const quota = await (0, usage_service_1.consumeDailyTweetQuota)(req.userId, 1, timeZone);
    if (!quota.allowed) {
        res.status(402).json({
            error: 'Daily tweet composer limit reached. Upgrade to Starter or Pro to continue.',
            code: 'USAGE_LIMIT_EXCEEDED',
            usage: {
                planId: quota.planId,
                used: quota.used,
                limit: quota.limit,
                remaining: quota.remaining,
            },
        });
        return;
    }
    // ✅ Await to get replyId
    let replyId = null;
    try {
        const [, createdReply] = await Promise.all([
            trackUsage(req.userId, '/ai/create', tokens),
            db_1.prisma.reply.create({
                data: { userId: req.userId, tweetId: null, tweetText: topic, replyText: tweet, tone },
            }),
        ]);
        replyId = createdReply.id;
        updateDailyStats(req.userId, 'generated', timeZone).catch((dbErr) => {
            console.error('[/ai/create] dailyStats error (non-fatal):', dbErr.message);
        });
    }
    catch (dbErr) {
        console.error('[/ai/create] DB write error (non-fatal):', dbErr.message);
    }
    res.json({ tweet, tone, replyId });
}
// ── POST /ai/rewrite ──────────────────────────────────────────────────────────
async function rewriteTweet(req, res) {
    const { draftText, tone = 'smart', wordCount = 50, templateId } = req.body;
    if (!draftText) {
        res.status(400).json({ error: 'draftText required' });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    let rewrite;
    let tokens;
    try {
        ({ rewrite, tokens } = await AIService.rewriteTweet(draftText, tone, userApiKey, wordCount, templateId));
    }
    catch (err) {
        console.error('[/ai/rewrite] AIService error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to rewrite tweet' });
        return;
    }
    trackUsage(req.userId, '/ai/rewrite', tokens).catch((dbErr) => {
        console.error('[/ai/rewrite] DB write error (non-fatal):', dbErr.message);
    });
    res.json({ rewrite, tone });
}
// ── POST /ai/mark-posted ──────────────────────────────────────────────────────
async function markPosted(req, res) {
    const { replyId } = req.body;
    if (!replyId) {
        res.status(400).json({ error: 'replyId required' });
        return;
    }
    try {
        const timeZone = (0, timezone_1.readTimezoneFromRequest)(req);
        await db_1.prisma.reply.updateMany({
            where: { id: replyId, userId: req.userId },
            data: { posted: true },
        });
        updateDailyStats(req.userId, 'posted', timeZone).catch((dbErr) => {
            console.error('[/ai/mark-posted] DB write error (non-fatal):', dbErr.message);
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to mark as posted' });
    }
}
// ── GET /ai/templates ─────────────────────────────────────────────────────────
async function getTemplates(_req, res) {
    res.json(AIService.TEMPLATES);
}
async function viralHookIntel(req, res) {
    if (!(await requireFeature(req, res, "viralHookIntelligence")))
        return;
    const { niche = "", samplePosts = [] } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const posts = Array.isArray(samplePosts) ? samplePosts.slice(0, 20).map(String) : [];
    const { analysis, tokens } = await AIService.viralHookIntelligence(niche.trim(), posts, userApiKey);
    await trackUsage(req.userId, "/ai/viral-hook-intel", tokens);
    res.json(analysis);
}
async function preLaunchOptimize(req, res) {
    if (!(await requireFeature(req, res, "preLaunchOptimizer")))
        return;
    const { draft = "", niche = "" } = req.body || {};
    if (!draft.trim()) {
        res.status(400).json({ error: "draft required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const bestHours = await bestPostingHoursForUser(req.userId);
    const { analysis, tokens } = await AIService.preLaunchOptimizer(String(draft), String(niche || "general growth"), bestHours, userApiKey);
    await trackUsage(req.userId, "/ai/prelaunch-optimize", tokens);
    res.json(analysis);
}
async function viralScore(req, res) {
    if (!(await requireFeature(req, res, "viralScorePredictor")))
        return;
    const { draft = "", niche = "" } = req.body || {};
    if (!draft.trim()) {
        res.status(400).json({ error: "draft required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.viralScorePredictor(String(draft), String(niche || "general growth"), userApiKey);
    await trackUsage(req.userId, "/ai/viral-score", tokens);
    res.json(analysis);
}
async function bestTimePost(req, res) {
    if (!(await requireFeature(req, res, "bestTimeToPost")))
        return;
    const { niche = "" } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const bestHours = await bestPostingHoursForUser(req.userId);
    const { analysis, tokens } = await AIService.bestTimeToPost(String(niche), bestHours, userApiKey);
    await trackUsage(req.userId, "/ai/best-time-post", tokens);
    res.json(analysis);
}
async function contentPredict(req, res) {
    if (!(await requireFeature(req, res, "contentPerformancePrediction")))
        return;
    const { draft = "", niche = "" } = req.body || {};
    if (!draft.trim()) {
        res.status(400).json({ error: "draft required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const bestHours = await bestPostingHoursForUser(req.userId);
    const { analysis, tokens } = await AIService.contentPerformancePrediction(String(draft), String(niche || "general growth"), bestHours, userApiKey);
    await trackUsage(req.userId, "/ai/content-predict", tokens);
    res.json(analysis);
}
async function trendRadar(req, res) {
    if (!(await requireFeature(req, res, "nicheTrendRadar")))
        return;
    const { niche = "" } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.nicheTrendRadar(String(niche), userApiKey);
    await trackUsage(req.userId, "/ai/trend-radar", tokens);
    res.json(analysis);
}
async function growthStrategist(req, res) {
    if (!(await requireFeature(req, res, "growthStrategist")))
        return;
    const { niche = "", goals = "" } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.growthStrategistMode(String(niche), String(goals || "Audience growth"), userApiKey);
    await trackUsage(req.userId, "/ai/growth-strategist", tokens);
    res.json(analysis);
}
async function brandAnalyzer(req, res) {
    if (!(await requireFeature(req, res, "brandAnalyzer")))
        return;
    const { profile = "", tweets = [] } = req.body || {};
    if (!profile.trim()) {
        res.status(400).json({ error: "profile required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const list = Array.isArray(tweets) ? tweets.slice(0, 20).map(String) : [];
    const { analysis, tokens } = await AIService.personalBrandAnalyzer(String(profile), list, userApiKey);
    await trackUsage(req.userId, "/ai/brand-analyzer", tokens);
    res.json(analysis);
}
async function threadWriterPro(req, res) {
    if (!(await requireFeature(req, res, "threadWriterPro")))
        return;
    const { topic = "", objective = "" } = req.body || {};
    if (!topic.trim()) {
        res.status(400).json({ error: "topic required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.threadWriterPro(String(topic), String(objective || "Engagement + conversion"), userApiKey);
    await trackUsage(req.userId, "/ai/thread-pro", tokens);
    res.json(analysis);
}
async function leadMagnet(req, res) {
    if (!(await requireFeature(req, res, "leadMagnetGenerator")))
        return;
    const { content = "", audience = "" } = req.body || {};
    if (!content.trim()) {
        res.status(400).json({ error: "content required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.leadMagnetGenerator(String(content), String(audience || "creators"), userApiKey);
    await trackUsage(req.userId, "/ai/lead-magnet", tokens);
    res.json(analysis);
}
async function audiencePsychology(req, res) {
    if (!(await requireFeature(req, res, "audiencePsychology")))
        return;
    const { niche = "", audience = "" } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.audiencePsychologyInsights(String(niche), String(audience || "creators on X"), userApiKey);
    await trackUsage(req.userId, "/ai/audience-psychology", tokens);
    res.json(analysis);
}
async function repurposeContent(req, res) {
    if (!(await requireFeature(req, res, "repurposingEngine")))
        return;
    const { source = "" } = req.body || {};
    if (!source.trim()) {
        res.status(400).json({ error: "source required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.repurposingEngine(String(source), userApiKey);
    await trackUsage(req.userId, "/ai/repurpose", tokens);
    res.json(analysis);
}
async function monetizationToolkit(req, res) {
    if (!(await requireFeature(req, res, "monetizationToolkit")))
        return;
    const { niche = "", audience = "" } = req.body || {};
    if (!niche.trim()) {
        res.status(400).json({ error: "niche required" });
        return;
    }
    const userApiKey = await getUserApiKey(req.userId);
    const { analysis, tokens } = await AIService.monetizationToolkit(String(niche), String(audience || "creator audience"), userApiKey);
    await trackUsage(req.userId, "/ai/monetization-toolkit", tokens);
    res.json(analysis);
}

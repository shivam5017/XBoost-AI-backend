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
const db_1 = require("../lib/db");
const AIService = __importStar(require("../services/ai.service"));
const usage_service_1 = require("../services/usage.service");
const timezone_1 = require("../utils/timezone");
const apikey_service_1 = require("../services/apikey.service");
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

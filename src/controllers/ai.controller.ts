import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import * as AIService from '../services/ai.service';
import { consumeDailyReplyQuota, consumeDailyTweetQuota } from '../services/usage.service';
import { readTimezoneFromRequest, startOfDayUtcForTimezone } from '../utils/timezone';

async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openaiKey: true },
  });
  return user?.openaiKey ?? null;
}

async function trackUsage(userId: string, endpoint: string, tokens: number): Promise<void> {
  await prisma.aIUsage.create({ data: { userId, endpoint, tokens } });
}

async function updateDailyStats(
  userId: string,
  increment: 'generated' | 'posted',
  timeZone = "UTC",
): Promise<void> {
  const today = startOfDayUtcForTimezone(new Date(), timeZone);

  await prisma.dailyStats.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      repliesGenerated:     increment === 'generated' ? 1 : 0,
      repliesPosted:        increment === 'posted'    ? 1 : 0,
      estimatedImpressions: increment === 'posted'    ? Math.floor(Math.random() * 200 + 50) : 0,
    },
    update: {
      repliesGenerated:     increment === 'generated' ? { increment: 1 } : undefined,
      repliesPosted:        increment === 'posted'    ? { increment: 1 } : undefined,
      estimatedImpressions: increment === 'posted'
        ? { increment: Math.floor(Math.random() * 200 + 50) }
        : undefined,
    },
  });
}

// ── POST /ai/reply ────────────────────────────────────────────────────────────
// ── POST /ai/reply ────────────────────────────────────────────────────────────
export async function generateReply(req: AuthRequest, res: Response): Promise<void> {
  const { tweetText, tone = 'smart', tweetId, wordCount = 50, templateId } = req.body;
  if (!tweetText) { res.status(400).json({ error: 'tweetText required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let reply: string;
  let tokens: number;
  try {
    ({ reply, tokens } = await AIService.generateReply(tweetText, tone, userApiKey, wordCount, templateId));
  } catch (err: any) {
    console.error('[/ai/reply] AIService error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to generate reply' });
    return;
  }

  const timeZone = readTimezoneFromRequest(req);
  const quota = await consumeDailyReplyQuota(req.userId!, 1, timeZone);
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
  let replyId: string | null = null;
  try {
    const [, createdReply] = await Promise.all([
      trackUsage(req.userId!, '/ai/reply', tokens),
      prisma.reply.create({
        data: { userId: req.userId!, tweetId: tweetId ?? null, tweetText, replyText: reply, tone },
      }),
    ]);
    replyId = createdReply.id;
    updateDailyStats(req.userId!, 'generated', timeZone).catch((dbErr) => {
      console.error('[/ai/reply] dailyStats error (non-fatal):', dbErr.message);
    });
  } catch (dbErr: any) {
    console.error('[/ai/reply] DB write error (non-fatal):', dbErr.message);
  }

  res.json({ reply, tone, replyId });
}

// ── POST /ai/analyze ──────────────────────────────────────────────────────────
export async function analyzeTweet(req: AuthRequest, res: Response): Promise<void> {
  const { tweetText } = req.body;
  if (!tweetText) { res.status(400).json({ error: 'tweetText required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let analysis: object;
  let tokens: number;
  try {
    ({ analysis, tokens } = await AIService.analyzeTweet(tweetText, userApiKey));
  } catch (err: any) {
    console.error('[/ai/analyze] AIService error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to analyze tweet' });
    return;
  }

  trackUsage(req.userId!, '/ai/analyze', tokens).catch((dbErr) => {
    console.error('[/ai/analyze] DB write error (non-fatal):', dbErr.message);
  });

  res.json(analysis);
}

// ── POST /ai/create ───────────────────────────────────────────────────────────
// ── POST /ai/create ───────────────────────────────────────────────────────────
export async function createTweet(req: AuthRequest, res: Response): Promise<void> {
  const { topic, tone = 'smart', wordCount = 50, templateId } = req.body;
  if (!topic) { res.status(400).json({ error: 'topic required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let tweet: string;
  let tokens: number;
  try {
    ({ tweet, tokens } = await AIService.createTweet(topic, tone, userApiKey, wordCount, templateId));
  } catch (err: any) {
    console.error('[/ai/create] AIService error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create tweet' });
    return;
  }

  const timeZone = readTimezoneFromRequest(req);
  const quota = await consumeDailyTweetQuota(req.userId!, 1, timeZone);
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
  let replyId: string | null = null;
  try {
    const [, createdReply] = await Promise.all([
      trackUsage(req.userId!, '/ai/create', tokens),
      prisma.reply.create({
        data: { userId: req.userId!, tweetId: null, tweetText: topic, replyText: tweet, tone },
      }),
    ]);
    replyId = createdReply.id;
    updateDailyStats(req.userId!, 'generated', timeZone).catch((dbErr) => {
      console.error('[/ai/create] dailyStats error (non-fatal):', dbErr.message);
    });
  } catch (dbErr: any) {
    console.error('[/ai/create] DB write error (non-fatal):', dbErr.message);
  }

  res.json({ tweet, tone, replyId });
}

// ── POST /ai/rewrite ──────────────────────────────────────────────────────────
export async function rewriteTweet(req: AuthRequest, res: Response): Promise<void> {
  const { draftText, tone = 'smart', wordCount = 50, templateId } = req.body;
  if (!draftText) { res.status(400).json({ error: 'draftText required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let rewrite: string;
  let tokens: number;
  try {
    ({ rewrite, tokens } = await AIService.rewriteTweet(draftText, tone, userApiKey, wordCount, templateId));
  } catch (err: any) {
    console.error('[/ai/rewrite] AIService error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to rewrite tweet' });
    return;
  }

  trackUsage(req.userId!, '/ai/rewrite', tokens).catch((dbErr) => {
    console.error('[/ai/rewrite] DB write error (non-fatal):', dbErr.message);
  });

  res.json({ rewrite, tone });
}

// ── POST /ai/mark-posted ──────────────────────────────────────────────────────
export async function markPosted(req: AuthRequest, res: Response): Promise<void> {
  const { replyId } = req.body;
  if (!replyId) { res.status(400).json({ error: 'replyId required' }); return; }

  try {
    const timeZone = readTimezoneFromRequest(req);
    await prisma.reply.updateMany({
      where: { id: replyId, userId: req.userId },
      data: { posted: true },
    });
    updateDailyStats(req.userId!, 'posted', timeZone).catch((dbErr) => {
      console.error('[/ai/mark-posted] DB write error (non-fatal):', dbErr.message);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to mark as posted' });
  }
}

// ── GET /ai/templates ─────────────────────────────────────────────────────────
export async function getTemplates(_req: AuthRequest, res: Response): Promise<void> {
  res.json(AIService.TEMPLATES);
}

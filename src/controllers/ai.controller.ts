import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import * as AIService from '../services/ai.service';
import { listTemplates } from "../services/catalog.service";
import { consumeDailyReplyQuota, consumeDailyTweetQuota } from '../services/usage.service';
import { readTimezoneFromRequest, startOfDayUtcForTimezone } from '../utils/timezone';
import { getProviderApiKey } from "../services/apikey.service";
import { hasFeatureAccess, FeatureId } from "../services/billing.service";

async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openaiKey: true },
  });
  if (!user?.openaiKey) return null;
  return (
    getProviderApiKey(user.openaiKey, "openai") ||
    getProviderApiKey(user.openaiKey, "chatgpt") ||
    null
  );
}

async function trackUsage(userId: string, endpoint: string, tokens: number): Promise<void> {
  await prisma.aIUsage.create({ data: { userId, endpoint, tokens } });
}

async function requireFeature(
  req: AuthRequest,
  res: Response,
  featureId: FeatureId,
): Promise<boolean> {
  const allowed = await hasFeatureAccess(req.userId!, featureId);
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

async function bestPostingHoursForUser(userId: string): Promise<number[]> {
  const usage = await prisma.aIUsage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { createdAt: true },
  });
  if (!usage.length) return [9, 13, 18];

  const counts = new Array<number>(24).fill(0);
  for (const item of usage) counts[item.createdAt.getUTCHours()] += 1;

  return counts
    .map((count, hour) => ({ count, hour }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => x.hour)
    .sort((a, b) => a - b);
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
  const { tweetText, tone = 'smart', tweetId, wordCount = 50, templateId, customPrompt } = req.body;
  if (!tweetText) { res.status(400).json({ error: 'tweetText required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let reply: string;
  let tokens: number;
  try {
    ({ reply, tokens } = await AIService.generateReply(tweetText, tone, userApiKey, wordCount, templateId, customPrompt));
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
  const { topic, tone = 'smart', wordCount = 50, templateId, customPrompt } = req.body;
  if (!topic) { res.status(400).json({ error: 'topic required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let tweet: string;
  let tokens: number;
  try {
    ({ tweet, tokens } = await AIService.createTweet(topic, tone, userApiKey, wordCount, templateId, customPrompt));
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
  const { draftText, tone = 'smart', wordCount = 50, templateId, customPrompt } = req.body;
  if (!draftText) { res.status(400).json({ error: 'draftText required' }); return; }

  const userApiKey = await getUserApiKey(req.userId!);

  let rewrite: string;
  let tokens: number;
  try {
    ({ rewrite, tokens } = await AIService.rewriteTweet(draftText, tone, userApiKey, wordCount, templateId, customPrompt));
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
  const templates = await AIService.getActiveTemplates("all");
  res.json(templates);
}

export async function getTemplatesCatalog(_req: AuthRequest, res: Response): Promise<void> {
  const templates = await listTemplates();
  res.json(templates);
}

export async function getTones(_req: AuthRequest, res: Response): Promise<void> {
  const tones = await AIService.getToneCatalog();
  res.json(tones);
}

export async function viralHookIntel(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "viralHookIntelligence"))) return;

  const { niche = "", samplePosts = [] } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }

  const userApiKey = await getUserApiKey(req.userId!);
  const posts = Array.isArray(samplePosts) ? samplePosts.slice(0, 20).map(String) : [];
  const { analysis, tokens } = await AIService.viralHookIntelligence(
    niche.trim(),
    posts,
    userApiKey,
  );
  await trackUsage(req.userId!, "/ai/viral-hook-intel", tokens);
  res.json(analysis);
}

export async function preLaunchOptimize(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "preLaunchOptimizer"))) return;

  const { draft = "", niche = "" } = req.body || {};
  if (!draft.trim()) {
    res.status(400).json({ error: "draft required" });
    return;
  }

  const userApiKey = await getUserApiKey(req.userId!);
  const bestHours = await bestPostingHoursForUser(req.userId!);
  const { analysis, tokens } = await AIService.preLaunchOptimizer(
    String(draft),
    String(niche || "general growth"),
    bestHours,
    userApiKey,
  );
  await trackUsage(req.userId!, "/ai/prelaunch-optimize", tokens);
  res.json(analysis);
}

export async function viralScore(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "viralScorePredictor"))) return;
  const { draft = "", niche = "" } = req.body || {};
  if (!draft.trim()) {
    res.status(400).json({ error: "draft required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.viralScorePredictor(String(draft), String(niche || "general growth"), userApiKey);
  await trackUsage(req.userId!, "/ai/viral-score", tokens);
  res.json(analysis);
}

export async function bestTimePost(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "bestTimeToPost"))) return;
  const { niche = "" } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const bestHours = await bestPostingHoursForUser(req.userId!);
  const { analysis, tokens } = await AIService.bestTimeToPost(String(niche), bestHours, userApiKey);
  await trackUsage(req.userId!, "/ai/best-time-post", tokens);
  res.json(analysis);
}

export async function contentPredict(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "contentPerformancePrediction"))) return;
  const { draft = "", niche = "" } = req.body || {};
  if (!draft.trim()) {
    res.status(400).json({ error: "draft required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const bestHours = await bestPostingHoursForUser(req.userId!);
  const { analysis, tokens } = await AIService.contentPerformancePrediction(
    String(draft),
    String(niche || "general growth"),
    bestHours,
    userApiKey,
  );
  await trackUsage(req.userId!, "/ai/content-predict", tokens);
  res.json(analysis);
}

export async function trendRadar(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "nicheTrendRadar"))) return;
  const { niche = "" } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.nicheTrendRadar(String(niche), userApiKey);
  await trackUsage(req.userId!, "/ai/trend-radar", tokens);
  res.json(analysis);
}

export async function growthStrategist(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "growthStrategist"))) return;
  const { niche = "", goals = "" } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.growthStrategistMode(String(niche), String(goals || "Audience growth"), userApiKey);
  await trackUsage(req.userId!, "/ai/growth-strategist", tokens);
  res.json(analysis);
}

export async function brandAnalyzer(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "brandAnalyzer"))) return;
  const { profile = "", tweets = [] } = req.body || {};
  if (!profile.trim()) {
    res.status(400).json({ error: "profile required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const list = Array.isArray(tweets) ? tweets.slice(0, 20).map(String) : [];
  const { analysis, tokens } = await AIService.personalBrandAnalyzer(String(profile), list, userApiKey);
  await trackUsage(req.userId!, "/ai/brand-analyzer", tokens);
  res.json(analysis);
}

export async function threadWriterPro(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "threadWriterPro"))) return;
  const { topic = "", objective = "" } = req.body || {};
  if (!topic.trim()) {
    res.status(400).json({ error: "topic required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.threadWriterPro(String(topic), String(objective || "Engagement + conversion"), userApiKey);
  await trackUsage(req.userId!, "/ai/thread-pro", tokens);
  res.json(analysis);
}

export async function leadMagnet(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "leadMagnetGenerator"))) return;
  const { content = "", audience = "" } = req.body || {};
  if (!content.trim()) {
    res.status(400).json({ error: "content required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.leadMagnetGenerator(String(content), String(audience || "creators"), userApiKey);
  await trackUsage(req.userId!, "/ai/lead-magnet", tokens);
  res.json(analysis);
}

export async function audiencePsychology(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "audiencePsychology"))) return;
  const { niche = "", audience = "" } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.audiencePsychologyInsights(String(niche), String(audience || "creators on X"), userApiKey);
  await trackUsage(req.userId!, "/ai/audience-psychology", tokens);
  res.json(analysis);
}

export async function repurposeContent(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "repurposingEngine"))) return;
  const { source = "" } = req.body || {};
  if (!source.trim()) {
    res.status(400).json({ error: "source required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.repurposingEngine(String(source), userApiKey);
  await trackUsage(req.userId!, "/ai/repurpose", tokens);
  res.json(analysis);
}

export async function monetizationToolkit(req: AuthRequest, res: Response): Promise<void> {
  if (!(await requireFeature(req, res, "monetizationToolkit"))) return;
  const { niche = "", audience = "" } = req.body || {};
  if (!niche.trim()) {
    res.status(400).json({ error: "niche required" });
    return;
  }
  const userApiKey = await getUserApiKey(req.userId!);
  const { analysis, tokens } = await AIService.monetizationToolkit(String(niche), String(audience || "creator audience"), userApiKey);
  await trackUsage(req.userId!, "/ai/monetization-toolkit", tokens);
  res.json(analysis);
}

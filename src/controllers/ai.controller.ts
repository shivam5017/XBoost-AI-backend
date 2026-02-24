import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import * as AIService from '../services/ai.service';

async function trackUsage(userId: string, endpoint: string, tokens: number) {
  await prisma.aIUsage.create({ data: { userId, endpoint, tokens } });
}

async function updateDailyStats(userId: string, increment: 'generated' | 'posted') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyStats.upsert({
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
      estimatedImpressions: increment === 'posted' ? { increment: Math.floor(Math.random() * 200 + 50) } : undefined,
    },
  });
}

export async function generateReply(req: AuthRequest, res: Response): Promise<void> {
  const { tweetText, tone = 'smart', tweetId } = req.body;
  if (!tweetText) { res.status(400).json({ error: 'tweetText required' }); return; }

  const { reply, tokens } = await AIService.generateReply(tweetText, tone);

  await Promise.all([
    trackUsage(req.userId!, '/ai/reply', tokens),
    prisma.reply.create({
      data: { userId: req.userId!, tweetId, tweetText, replyText: reply, tone },
    }),
    updateDailyStats(req.userId!, 'generated'),
  ]);

  res.json({ reply, tone });
}

export async function analyzeTweet(req: AuthRequest, res: Response): Promise<void> {
  const { tweetText } = req.body;
  if (!tweetText) { res.status(400).json({ error: 'tweetText required' }); return; }

  const { analysis, tokens } = await AIService.analyzeTweet(tweetText);
  await trackUsage(req.userId!, '/ai/analyze', tokens);
  res.json(analysis);
}

export async function createTweet(req: AuthRequest, res: Response): Promise<void> {
  const { topic, tone = 'smart' } = req.body;
  if (!topic) { res.status(400).json({ error: 'topic required' }); return; }

  const { tweet, tokens } = await AIService.createTweet(topic, tone);
  await trackUsage(req.userId!, '/ai/create', tokens);
  res.json({ tweet, tone });
}

export async function rewriteTweet(req: AuthRequest, res: Response): Promise<void> {
  const { draftText, tone = 'smart' } = req.body;
  if (!draftText) { res.status(400).json({ error: 'draftText required' }); return; }

  const { rewrite, tokens } = await AIService.rewriteTweet(draftText, tone);
  await trackUsage(req.userId!, '/ai/rewrite', tokens);
  res.json({ rewrite, tone });
}

export async function markPosted(req: AuthRequest, res: Response): Promise<void> {
  const { replyId } = req.body;
  if (!replyId) { res.status(400).json({ error: 'replyId required' }); return; }

  await prisma.reply.updateMany({
    where: { id: replyId, userId: req.userId },
    data: { posted: true },
  });
  await updateDailyStats(req.userId!, 'posted');
  res.json({ success: true });
}

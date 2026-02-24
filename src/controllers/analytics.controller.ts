import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import { computeWeeklyAnalytics } from '../services/analytics.service';

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [user, todayStats, streak, weeklyStats, totalReplies, aiUsageCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId }, select: { dailyGoal: true, username: true } }),
    prisma.dailyStats.findFirst({ where: { userId: req.userId!, date: { gte: today } } }),
    prisma.streak.findUnique({ where: { userId: req.userId } }),
    prisma.dailyStats.findMany({ where: { userId: req.userId!, date: { gte: weekAgo } }, orderBy: { date: 'asc' } }),
    prisma.reply.count({ where: { userId: req.userId!, posted: true } }),
    prisma.aIUsage.count({ where: { userId: req.userId! } }),
  ]);

  const TIPS = [
    'Reply within the first hour of trending tweets for max visibility.',
    'Ask a question in your reply — it doubles engagement.',
    'Consistency beats virality. 10 replies/day > 1 viral tweet/week.',
    'Comment on big accounts in your niche before their tweets get popular.',
    'Use "controversial" tone sparingly — once a day keeps the algorithm interested.',
  ];

  res.json({
    user,
    today: {
      repliesGenerated: todayStats?.repliesGenerated || 0,
      repliesPosted: todayStats?.repliesPosted || 0,
      goal: user?.dailyGoal || 5,
      goalCompleted: todayStats?.goalCompleted || false,
    },
    streak: {
      current: streak?.current || 0,
      longest: streak?.longest || 0,
    },
    totals: {
      replies: totalReplies,
      aiUsage: aiUsageCount,
    },
    weeklyChart: weeklyStats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      replies: s.repliesPosted,
      impressions: s.estimatedImpressions,
    })),
    tipOfTheDay: TIPS[new Date().getDay() % TIPS.length],
  });
}

export async function getWeeklyReport(req: AuthRequest, res: Response): Promise<void> {
  await computeWeeklyAnalytics(req.userId!);
  const analytics = await prisma.analytics.findFirst({
    where: { userId: req.userId!, period: 'weekly' },
    orderBy: { createdAt: 'desc' },
  });
  res.json(analytics);
}

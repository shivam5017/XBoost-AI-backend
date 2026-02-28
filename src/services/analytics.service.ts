import { prisma } from '../lib/db';
import { dayRangeUtcForTimezone, readTimezone } from "../utils/timezone";

function getGrowthRating(avgReplies: number, consistency: number): string {
  const score = avgReplies * consistency;
  if (score >= 15) return 'Machine';
  if (score >= 7) return 'Builder';
  return 'Beginner';
}

export async function computeWeeklyAnalytics(userId: string, timeZone = "UTC"): Promise<void> {
  const tz = readTimezone(timeZone);
  const { start: todayStart } = dayRangeUtcForTimezone(new Date(), tz);
  const weekAgo = new Date(todayStart);
  weekAgo.setUTCDate(todayStart.getUTCDate() - 6); // last 7 local days

  const stats = await prisma.dailyStats.findMany({
    where: {
      userId,
      date: { gte: weekAgo },
    },
  });

  const totalReplies = stats.reduce((s, d) => s + d.repliesPosted, 0);
  const avgRepliesPerDay = totalReplies / 7;

  const daysCompleted = stats.filter(d => d.goalCompleted).length;
  const consistencyScore = daysCompleted / 7;

  const estimatedImpressions = stats.reduce(
    (s, d) => s + d.estimatedImpressions,
    0
  );

  const growthRating = getGrowthRating(avgRepliesPerDay, consistencyScore);

  await prisma.analytics.upsert({
    where: {
      id: `${userId}_weekly_${weekAgo.toISOString().split('T')[0]}`,
    },
    create: {
      id: `${userId}_weekly_${weekAgo.toISOString().split('T')[0]}`,
      userId,
      period: 'weekly',
      periodStart: weekAgo,
      totalReplies,
      avgRepliesPerDay,
      consistencyScore,
      growthRating,
      estimatedImpressions,
    },
    update: {
      totalReplies,
      avgRepliesPerDay,
      consistencyScore,
      growthRating,
      estimatedImpressions,
    },
  });
}

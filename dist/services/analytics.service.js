"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeWeeklyAnalytics = computeWeeklyAnalytics;
const db_1 = require("../lib/db");
function getGrowthRating(avgReplies, consistency) {
    const score = avgReplies * consistency;
    if (score >= 15)
        return 'Machine';
    if (score >= 7)
        return 'Builder';
    return 'Beginner';
}
async function computeWeeklyAnalytics(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6); // SAME LOGIC AS DASHBOARD
    const stats = await db_1.prisma.dailyStats.findMany({
        where: {
            userId,
            date: { gte: weekAgo },
        },
    });
    const totalReplies = stats.reduce((s, d) => s + d.repliesPosted, 0);
    const avgRepliesPerDay = totalReplies / 7;
    const daysCompleted = stats.filter(d => d.goalCompleted).length;
    const consistencyScore = daysCompleted / 7;
    const estimatedImpressions = stats.reduce((s, d) => s + d.estimatedImpressions, 0);
    const growthRating = getGrowthRating(avgRepliesPerDay, consistencyScore);
    await db_1.prisma.analytics.upsert({
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

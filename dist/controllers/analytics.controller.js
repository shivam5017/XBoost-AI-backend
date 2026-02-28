"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
exports.getWeeklyReport = getWeeklyReport;
exports.getActivity = getActivity;
const db_1 = require("../lib/db");
const analytics_service_1 = require("../services/analytics.service");
const streak_service_1 = require("../services/streak.service");
const enums_1 = require("../lib/generated/prisma/enums");
const usage_service_1 = require("../services/usage.service");
async function requireProAnalytics(req, res) {
    const planId = await (0, usage_service_1.getEffectivePlan)(req.userId);
    if (planId !== enums_1.PlanId.pro) {
        res.status(403).json({
            error: "Analytics dashboard is available on Pro plan only.",
            code: "ANALYTICS_PRO_REQUIRED",
            planId,
        });
        return false;
    }
    return true;
}
async function getDashboard(req, res) {
    if (!(await requireProAnalytics(req, res)))
        return;
    const today = new Date();
    await (0, streak_service_1.updateStreak)(req.userId);
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6); // last 7 days including today
    const [user, todayStats, streak, weeklyStats, totalReplies, aiUsageCount] = await Promise.all([
        db_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { dailyGoal: true, username: true },
        }),
        db_1.prisma.dailyStats.findFirst({
            where: { userId: req.userId, date: { gte: today } },
        }),
        db_1.prisma.streak.findUnique({ where: { userId: req.userId } }),
        db_1.prisma.dailyStats.findMany({
            where: { userId: req.userId, date: { gte: weekAgo } },
            orderBy: { date: "asc" },
        }),
        db_1.prisma.reply.count({
            where: { userId: req.userId },
        }),
        db_1.prisma.aIUsage.count({
            where: { userId: req.userId },
        }),
    ]);
    // ✅ ALWAYS RETURN 7 DAYS
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().split("T")[0];
        const stat = weeklyStats.find((s) => s.date.toISOString().split("T")[0] === iso);
        days.push({
            date: iso,
            replies: stat?.repliesPosted ?? 0,
            impressions: stat?.estimatedImpressions ?? 0,
        });
    }
    const TIPS = [
        "Reply within the first hour of trending tweets for max visibility.",
        "Ask a question in your reply — it doubles engagement.",
        "Consistency beats virality. 10 replies/day > 1 viral tweet/week.",
        "Comment on big accounts in your niche before their tweets get popular.",
        "Use controversial tone sparingly — once a day keeps the algorithm interested.",
    ];
    res.json({
        user,
        today: {
            repliesGenerated: todayStats?.repliesGenerated ?? 0,
            repliesPosted: todayStats?.repliesPosted ?? 0,
            goal: user?.dailyGoal ?? 5,
            goalCompleted: todayStats?.goalCompleted ?? false,
        },
        streak: {
            current: streak?.current ?? 0,
            longest: streak?.longest ?? 0,
        },
        totals: {
            replies: totalReplies,
            aiUsage: aiUsageCount,
        },
        weeklyChart: days, // ✅ use normalized 7-day array
        tipOfTheDay: TIPS[new Date().getDay() % TIPS.length],
    });
}
async function getWeeklyReport(req, res) {
    if (!(await requireProAnalytics(req, res)))
        return;
    await (0, analytics_service_1.computeWeeklyAnalytics)(req.userId);
    const analytics = await db_1.prisma.analytics.findFirst({
        where: { userId: req.userId, period: "weekly" },
        orderBy: { createdAt: "desc" },
    });
    res.json(analytics);
}
async function getActivity(req, res) {
    if (!(await requireProAnalytics(req, res)))
        return;
    const period = req.query.period || "week";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let days = [];
    if (period === "day") {
        // Hourly breakdown for today
        const todayStats = await db_1.prisma.dailyStats.findFirst({
            where: { userId: req.userId, date: { gte: today } },
        });
        const aiUsageToday = await db_1.prisma.aIUsage.count({
            where: {
                userId: req.userId,
                createdAt: { gte: today },
            },
        });
        // Return 24 hours — real data only for today's totals, spread evenly as approximation
        days = Array.from({ length: 24 }, (_, i) => ({
            label: `${i}:00`,
            replies: i === new Date().getHours() ? (todayStats?.repliesPosted ?? 0) : 0,
            aiUses: i === new Date().getHours() ? aiUsageToday : 0,
            impressions: i === new Date().getHours() ? (todayStats?.estimatedImpressions ?? 0) : 0,
        }));
    }
    else if (period === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        const [stats, aiUsageByDay] = await Promise.all([
            db_1.prisma.dailyStats.findMany({
                where: { userId: req.userId, date: { gte: weekAgo } },
                orderBy: { date: "asc" },
            }),
            db_1.prisma.aIUsage.groupBy({
                by: ["createdAt"],
                where: { userId: req.userId, createdAt: { gte: weekAgo } },
                _count: true,
            }),
        ]);
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const iso = d.toISOString().split("T")[0];
            const stat = stats.find((s) => s.date.toISOString().split("T")[0] === iso);
            const aiCount = aiUsageByDay.filter((a) => new Date(a.createdAt).toISOString().split("T")[0] === iso).length;
            days.push({
                label: DAY_LABELS[d.getDay()],
                replies: stat?.repliesPosted ?? 0,
                aiUses: aiCount,
                impressions: stat?.estimatedImpressions ?? 0,
            });
        }
    }
    else if (period === "month") {
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 29); // last 30 days
        const [stats, aiUsageAll] = await Promise.all([
            db_1.prisma.dailyStats.findMany({
                where: { userId: req.userId, date: { gte: monthAgo } },
                orderBy: { date: "asc" },
            }),
            db_1.prisma.aIUsage.findMany({
                where: { userId: req.userId, createdAt: { gte: monthAgo } },
                select: { createdAt: true },
            }),
        ]);
        // Group into 4 weeks
        for (let w = 0; w < 4; w++) {
            const weekStart = new Date(monthAgo);
            weekStart.setDate(monthAgo.getDate() + w * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekStats = stats.filter((s) => s.date >= weekStart && s.date <= weekEnd);
            const weekAi = aiUsageAll.filter((a) => a.createdAt >= weekStart && a.createdAt <= weekEnd);
            days.push({
                label: `W${w + 1}`,
                replies: weekStats.reduce((s, d) => s + d.repliesPosted, 0),
                aiUses: weekAi.length,
                impressions: weekStats.reduce((s, d) => s + d.estimatedImpressions, 0),
            });
        }
    }
    // Streak history for the period
    const streakHistory = await db_1.prisma.dailyStats.findMany({
        where: {
            userId: req.userId,
            date: { gte: period === "month" ? new Date(today.getTime() - 29 * 86400000) : new Date(today.getTime() - 6 * 86400000) },
        },
        orderBy: { date: "asc" },
        select: { date: true, goalCompleted: true, repliesPosted: true, estimatedImpressions: true },
    });
    res.json({ activity: days, streakHistory });
}

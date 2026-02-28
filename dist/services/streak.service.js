"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStreak = updateStreak;
const db_1 = require("../lib/db");
function isSameDay(d1, d2) {
    return d1.toDateString() === d2.toDateString();
}
function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
}
async function updateStreak(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [streak, dailyStats] = await Promise.all([
        db_1.prisma.streak.findUnique({ where: { userId } }),
        db_1.prisma.dailyStats.findFirst({
            where: { userId, date: { gte: today } },
        }),
    ]);
    const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !dailyStats)
        return;
    const goalMet = dailyStats.repliesPosted >= user.dailyGoal;
    if (!streak) {
        await db_1.prisma.streak.create({
            data: {
                userId,
                current: goalMet ? 1 : 0,
                longest: goalMet ? 1 : 0,
                lastActiveDate: goalMet ? new Date() : null,
            },
        });
        return;
    }
    if (goalMet) {
        if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, new Date())) {
            return; // already updated today
        }
        const shouldContinue = streak.lastActiveDate && isYesterday(streak.lastActiveDate);
        const newCurrent = shouldContinue ? streak.current + 1 : 1;
        await db_1.prisma.streak.update({
            where: { userId },
            data: {
                current: newCurrent,
                longest: Math.max(streak.longest, newCurrent),
                lastActiveDate: new Date(),
            },
        });
    }
    else {
        // Check if yesterday was active - if today's goal not met yet, don't reset until EOD
        if (streak.lastActiveDate && !isSameDay(streak.lastActiveDate, new Date()) && !isYesterday(streak.lastActiveDate)) {
            await db_1.prisma.streak.update({
                where: { userId },
                data: { current: 0 },
            });
        }
    }
}

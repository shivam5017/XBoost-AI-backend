"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStreak = updateStreak;
const db_1 = require("../lib/db");
const timezone_1 = require("../utils/timezone");
function isSameDay(d1, d2, timeZone) {
    const tz = (0, timezone_1.readTimezone)(timeZone);
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(d1) === fmt.format(d2);
}
function isYesterday(date, timeZone) {
    const tz = (0, timezone_1.readTimezone)(timeZone);
    const now = new Date();
    const todayStart = (0, timezone_1.startOfDayUtcForTimezone)(now, tz);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const { end } = (0, timezone_1.dayRangeUtcForTimezone)(yesterdayStart, tz);
    return date >= yesterdayStart && date < end;
}
async function updateStreak(userId, timeZone = "UTC") {
    const tz = (0, timezone_1.readTimezone)(timeZone);
    const { start: todayStart } = (0, timezone_1.dayRangeUtcForTimezone)(new Date(), tz);
    const [streak, dailyStats] = await Promise.all([
        db_1.prisma.streak.findUnique({ where: { userId } }),
        db_1.prisma.dailyStats.findFirst({
            where: { userId, date: { gte: todayStart } },
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
        if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, new Date(), tz)) {
            return; // already updated today
        }
        const shouldContinue = streak.lastActiveDate && isYesterday(streak.lastActiveDate, tz);
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
        if (streak.lastActiveDate &&
            !isSameDay(streak.lastActiveDate, new Date(), tz) &&
            !isYesterday(streak.lastActiveDate, tz)) {
            await db_1.prisma.streak.update({
                where: { userId },
                data: { current: 0 },
            });
        }
    }
}

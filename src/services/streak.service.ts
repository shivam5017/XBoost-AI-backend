import { prisma } from '../lib/db';
import { dayRangeUtcForTimezone, readTimezone, startOfDayUtcForTimezone } from "../utils/timezone";

function isSameDay(d1: Date, d2: Date, timeZone: string): boolean {
  const tz = readTimezone(timeZone);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d1) === fmt.format(d2);
}

function isYesterday(date: Date, timeZone: string): boolean {
  const tz = readTimezone(timeZone);
  const now = new Date();
  const todayStart = startOfDayUtcForTimezone(now, tz);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  const { end } = dayRangeUtcForTimezone(yesterdayStart, tz);
  return date >= yesterdayStart && date < end;
}

export async function updateStreak(userId: string, timeZone = "UTC"): Promise<void> {
  const tz = readTimezone(timeZone);
  const { start: todayStart } = dayRangeUtcForTimezone(new Date(), tz);

  const [streak, dailyStats] = await Promise.all([
    prisma.streak.findUnique({ where: { userId } }),
    prisma.dailyStats.findFirst({
      where: { userId, date: { gte: todayStart } },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !dailyStats) return;

  const goalMet = dailyStats.repliesPosted >= user.dailyGoal;

  if (!streak) {
    await prisma.streak.create({
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

    await prisma.streak.update({
      where: { userId },
      data: {
        current: newCurrent,
        longest: Math.max(streak.longest, newCurrent),
        lastActiveDate: new Date(),
      },
    });
  } else {
    // Check if yesterday was active - if today's goal not met yet, don't reset until EOD
    if (
      streak.lastActiveDate &&
      !isSameDay(streak.lastActiveDate, new Date(), tz) &&
      !isYesterday(streak.lastActiveDate, tz)
    ) {
      await prisma.streak.update({
        where: { userId },
        data: { current: 0 },
      });
    }
  }
}

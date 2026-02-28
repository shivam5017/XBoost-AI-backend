"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStreak = getStreak;
exports.checkAndUpdateStreak = checkAndUpdateStreak;
const db_1 = require("../lib/db");
const streak_service_1 = require("../services/streak.service");
const timezone_1 = require("../utils/timezone");
async function getStreak(req, res) {
    const streak = await db_1.prisma.streak.findUnique({ where: { userId: req.userId } });
    res.json(streak || { current: 0, longest: 0 });
}
async function checkAndUpdateStreak(req, res) {
    await (0, streak_service_1.updateStreak)(req.userId, (0, timezone_1.readTimezoneFromRequest)(req));
    const streak = await db_1.prisma.streak.findUnique({ where: { userId: req.userId } });
    res.json(streak);
}

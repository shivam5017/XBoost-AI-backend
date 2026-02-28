"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReplies = getReplies;
exports.getReplyStats = getReplyStats;
const db_1 = require("../lib/db");
async function getReplies(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const replies = await db_1.prisma.reply.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
    });
    res.json(replies);
}
async function getReplyStats(req, res) {
    const [total, posted, byTone] = await Promise.all([
        db_1.prisma.reply.count({ where: { userId: req.userId } }),
        db_1.prisma.reply.count({ where: { userId: req.userId, posted: true } }),
        db_1.prisma.reply.groupBy({ by: ['tone'], where: { userId: req.userId }, _count: true }),
    ]);
    res.json({ total, posted, byTone });
}

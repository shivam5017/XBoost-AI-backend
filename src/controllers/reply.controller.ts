import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';

export async function getReplies(req: AuthRequest, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const replies = await prisma.reply.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });
  res.json(replies);
}

export async function getReplyStats(req: AuthRequest, res: Response): Promise<void> {
  const [total, posted, byTone] = await Promise.all([
    prisma.reply.count({ where: { userId: req.userId! } }),
    prisma.reply.count({ where: { userId: req.userId!, posted: true } }),
    prisma.reply.groupBy({ by: ['tone'], where: { userId: req.userId! }, _count: true }),
  ]);
  res.json({ total, posted, byTone });
}

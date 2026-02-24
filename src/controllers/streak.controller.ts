import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import { updateStreak } from '../services/streak.service';

export async function getStreak(req: AuthRequest, res: Response): Promise<void> {
  const streak = await prisma.streak.findUnique({ where: { userId: req.userId } });
  res.json(streak || { current: 0, longest: 0 });
}

export async function checkAndUpdateStreak(req: AuthRequest, res: Response): Promise<void> {
  await updateStreak(req.userId!);
  const streak = await prisma.streak.findUnique({ where: { userId: req.userId } });
  res.json(streak);
}

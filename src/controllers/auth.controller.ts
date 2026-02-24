import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/db'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { email, password, username } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, username },
  });

  // Create initial streak record
  await prisma.streak.create({ data: { userId: user.id } });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, dailyGoal: user.dailyGoal } });
}

export async function getProfile(req: Request & { userId?: string }, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, username: true, twitterHandle: true, dailyGoal: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
}

export async function updateGoal(req: Request & { userId?: string }, res: Response): Promise<void> {
  const { dailyGoal } = req.body;
  if (![5, 10, 20].includes(dailyGoal)) {
    res.status(400).json({ error: 'Daily goal must be 5, 10, or 20' });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { dailyGoal },
    select: { id: true, dailyGoal: true },
  });
  res.json(user);
}

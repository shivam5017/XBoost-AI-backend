import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/db";
import { AuthRequest } from "../middleware/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const JWT_SECRET = process.env.JWT_SECRET!;

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { email, password, username } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, username },
  });

  await prisma.streak.create({ data: { userId: user.id } });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
   
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      dailyGoal: user.dailyGoal,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      dailyGoal: user.dailyGoal,
      hasApiKey: !!user.openaiKey,
    },
  });
}

export async function getProfile(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      username: true,
      dailyGoal: true,
      createdAt: true,
      openaiKey: true, 
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    ...user,
    hasApiKey: !!user.openaiKey,
    openaiKey: user.openaiKey
      ? "••••••••••••••••" + user.openaiKey.slice(-4)
      : null,
  });
}

export async function updateGoal(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { dailyGoal } = req.body;
  if (![5, 10, 20].includes(dailyGoal)) {
    res.status(400).json({ error: "Daily goal must be 5, 10, or 20" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { dailyGoal },
    select: { id: true, dailyGoal: true },
  });
  res.json(user);
}

// ── NEW: Save user's OpenAI API key ──
export async function saveApiKey(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { openaiKey } = req.body;

  if (!openaiKey || typeof openaiKey !== "string") {
    res.status(400).json({ error: "openaiKey is required" });
    return;
  }

  // Basic validation — OpenAI keys start with sk-
  if (!openaiKey.startsWith("sk-")) {
    res.status(400).json({ error: "Invalid OpenAI API key format" });
    return;
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { openaiKey },
  });

  res.json({ success: true, hasApiKey: true });
}

// ── NEW: Remove user's OpenAI API key ──
export async function removeApiKey(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  await prisma.user.update({
    where: { id: req.userId },
    data: { openaiKey: null },
  });
  res.json({ success: true, hasApiKey: false });
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({ success: true });
}

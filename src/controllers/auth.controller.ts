import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/db";
import { AuthRequest } from "../middleware/auth";
import {
  ALLOWED_AI_PROVIDERS,
  listStoredProviders,
  removeProviderApiKey,
  upsertProviderApiKey,
} from "../services/apikey.service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const saveApiKeySchema = z.object({
  provider: z.enum(ALLOWED_AI_PROVIDERS).optional(),
  apiKey: z.string().optional(),
  openaiKey: z.string().optional(),
}).refine((data) => Boolean(data.apiKey || data.openaiKey), {
  message: "apiKey is required",
});

const removeApiKeySchema = z.object({
  provider: z.enum(ALLOWED_AI_PROVIDERS).optional(),
});

const JWT_SECRET = process.env.JWT_SECRET!;

const isProd = process.env.NODE_ENV === "production";
const cookieSameSite: "lax" | "none" = isProd ? "none" : "lax";
const cookieSecure = isProd;

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
    secure: cookieSecure,
    sameSite: cookieSameSite,
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
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      dailyGoal: user.dailyGoal,
      hasApiKey: listStoredProviders(user.openaiKey).length > 0,
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
    id: user.id,
    email: user.email,
    username: user.username,
    dailyGoal: user.dailyGoal,
    createdAt: user.createdAt,
    hasApiKey: listStoredProviders(user.openaiKey).length > 0,
    apiKeyProviders: listStoredProviders(user.openaiKey),
    openaiKey:
      listStoredProviders(user.openaiKey).find((p) => p.provider === "openai")
        ?.masked || null,
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
  const parsed = saveApiKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const provider = parsed.data.provider || "openai";
  const apiKey = parsed.data.apiKey || parsed.data.openaiKey!;
  const current = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { openaiKey: true },
  });

  try {
    const encrypted = upsertProviderApiKey(current?.openaiKey, provider, apiKey);
    await prisma.user.update({
      where: { id: req.userId },
      data: { openaiKey: encrypted },
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Invalid API key" });
    return;
  }

  const updated = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { openaiKey: true },
  });

  res.json({
    success: true,
    hasApiKey: listStoredProviders(updated?.openaiKey).length > 0,
    providers: listStoredProviders(updated?.openaiKey),
  });
}

// ── NEW: Remove user's OpenAI API key ──
export async function removeApiKey(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const parsed = removeApiKeySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const current = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { openaiKey: true },
  });

  const updatedValue = removeProviderApiKey(
    current?.openaiKey,
    parsed.data.provider,
  );

  await prisma.user.update({
    where: { id: req.userId },
    data: { openaiKey: updatedValue },
  });

  res.json({
    success: true,
    hasApiKey: Boolean(updatedValue),
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie("token", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
  });

  res.json({ success: true });
}

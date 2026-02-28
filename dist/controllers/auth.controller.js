"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.updateGoal = updateGoal;
exports.saveApiKey = saveApiKey;
exports.removeApiKey = removeApiKey;
exports.logout = logout;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const apikey_service_1 = require("../services/apikey.service");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    username: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const saveApiKeySchema = zod_1.z.object({
    provider: zod_1.z.enum(apikey_service_1.ALLOWED_AI_PROVIDERS).optional(),
    apiKey: zod_1.z.string().optional(),
    openaiKey: zod_1.z.string().optional(),
}).refine((data) => Boolean(data.apiKey || data.openaiKey), {
    message: "apiKey is required",
});
const removeApiKeySchema = zod_1.z.object({
    provider: zod_1.z.enum(apikey_service_1.ALLOWED_AI_PROVIDERS).optional(),
});
const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";
const cookieSameSite = isProd ? "none" : "lax";
const cookieSecure = isProd;
async function register(req, res) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues });
        return;
    }
    const { email, password, username } = parsed.data;
    const existing = await db_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const user = await db_1.prisma.user.create({
        data: { email, password: hashed, username },
    });
    await db_1.prisma.streak.create({ data: { userId: user.id } });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            dailyGoal: user.dailyGoal,
        },
    });
}
async function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues });
        return;
    }
    const { email, password } = parsed.data;
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            dailyGoal: user.dailyGoal,
            hasApiKey: (0, apikey_service_1.listStoredProviders)(user.openaiKey).length > 0,
        },
    });
}
async function getProfile(req, res) {
    const user = await db_1.prisma.user.findUnique({
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
        hasApiKey: (0, apikey_service_1.listStoredProviders)(user.openaiKey).length > 0,
        apiKeyProviders: (0, apikey_service_1.listStoredProviders)(user.openaiKey),
        openaiKey: (0, apikey_service_1.listStoredProviders)(user.openaiKey).find((p) => p.provider === "openai")
            ?.masked || null,
    });
}
async function updateGoal(req, res) {
    const { dailyGoal } = req.body;
    if (![5, 10, 20].includes(dailyGoal)) {
        res.status(400).json({ error: "Daily goal must be 5, 10, or 20" });
        return;
    }
    const user = await db_1.prisma.user.update({
        where: { id: req.userId },
        data: { dailyGoal },
        select: { id: true, dailyGoal: true },
    });
    res.json(user);
}
// ── NEW: Save user's OpenAI API key ──
async function saveApiKey(req, res) {
    const parsed = saveApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues });
        return;
    }
    const provider = parsed.data.provider || "openai";
    const apiKey = parsed.data.apiKey || parsed.data.openaiKey;
    const current = await db_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { openaiKey: true },
    });
    try {
        const encrypted = (0, apikey_service_1.upsertProviderApiKey)(current?.openaiKey, provider, apiKey);
        await db_1.prisma.user.update({
            where: { id: req.userId },
            data: { openaiKey: encrypted },
        });
    }
    catch (error) {
        res.status(400).json({ error: error?.message || "Invalid API key" });
        return;
    }
    const updated = await db_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { openaiKey: true },
    });
    res.json({
        success: true,
        hasApiKey: (0, apikey_service_1.listStoredProviders)(updated?.openaiKey).length > 0,
        providers: (0, apikey_service_1.listStoredProviders)(updated?.openaiKey),
    });
}
// ── NEW: Remove user's OpenAI API key ──
async function removeApiKey(req, res) {
    const parsed = removeApiKeySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues });
        return;
    }
    const current = await db_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { openaiKey: true },
    });
    const updatedValue = (0, apikey_service_1.removeProviderApiKey)(current?.openaiKey, parsed.data.provider);
    await db_1.prisma.user.update({
        where: { id: req.userId },
        data: { openaiKey: updatedValue },
    });
    res.json({
        success: true,
        hasApiKey: Boolean(updatedValue),
    });
}
async function logout(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
    });
    res.json({ success: true });
}

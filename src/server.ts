import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import streakRoutes from "./routes/streak";
import replyRoutes from "./routes/reply";
import billingRoutes from "./routes/billing";
import adminRoutes from "./routes/admin";
import { requestLogger } from "./middleware/logger.middleware";
import { requestTimeout } from "./middleware/request-timeout.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { dbCircuitSnapshot } from "./lib/db-resilience";
import { dbConnectionConfig, getDbPoolStats, pingDatabase } from "./lib/db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4500;

app.set("trust proxy", 1);

/* ───────────────── CORS CONFIG ───────────────── */

const baseAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://xboostai.in"
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...baseAllowedOrigins,
  ...envAllowedOrigins,
]);

const allowAllCors = process.env.CORS_ALLOW_ALL === "true";

function isOriginAllowed(origin: string): boolean {
  if (allowAllCors) return true;
  if (allowedOrigins.has(origin)) return true;

  if (origin.startsWith("chrome-extension://")) return true;
  if (/^https:\/\/(www\.)?x\.com$/i.test(origin)) return true;
  if (/^https:\/\/(www\.)?twitter\.com$/i.test(origin)) return true;

  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, origin);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-timezone", "x-admin-password"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

/* ───────────────── FORCE PREFLIGHT FIX ───────────────── */

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-timezone, x-admin-password");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ───────── RAW BODY FOR BILLING WEBHOOK ───────── */

app.use("/billing/webhook", express.raw({ type: "application/json" }));

/* ───────────────── MIDDLEWARE ───────────────── */

app.use(requestLogger);
app.use(requestTimeout);
app.use(cookieParser());
app.use(express.json());

/* ───────────────── RATE LIMIT ───────────────── */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ───────────────── ROUTES ───────────────── */

app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/streak", streakRoutes);
app.use("/reply", replyRoutes);
app.use("/billing", billingRoutes);
app.use("/admin", adminRoutes);

app.get("/health", async (_req, res) => {
  const [db, pool] = await Promise.all([pingDatabase(), Promise.resolve(getDbPoolStats())]);
  const circuit = dbCircuitSnapshot();

  const status = db.ok ? "ok" : "degraded";
  res.status(db.ok ? 200 : 503).json({
    status,
    uptimeSec: Math.round(process.uptime()),
    db,
    pool,
    circuit,
    connection: dbConnectionConfig,
  });
});

app.use(errorHandler);

/* ───────────────── START SERVER ───────────────── */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;

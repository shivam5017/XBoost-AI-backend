import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import streakRoutes from "./routes/streak";
import replyRoutes from "./routes/reply";
import billingRoutes from "./routes/billing";

const app = express();
const PORT = process.env.PORT || 4500;

app.set("trust proxy", 1);

/* ────────────────────────────────────────────────
   CORS CONFIG (CLEAN + COOKIE SAFE)
──────────────────────────────────────────────── */

const baseAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://xboostai.netlify.app",
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...baseAllowedOrigins,
  ...envAllowedOrigins,
]);

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;

  // Allow Netlify preview URLs
  if (/^https:\/\/([a-z0-9-]+\.)*netlify\.app$/i.test(origin)) return true;

  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, origin); // IMPORTANT: return exact origin
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true, // REQUIRED for cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ────────────────────────────────────────────────
   RAW BODY FOR WEBHOOK (BEFORE JSON PARSER)
──────────────────────────────────────────────── */

app.use("/billing/webhook", express.raw({ type: "application/json" }));

/* ────────────────────────────────────────────────
   GENERAL MIDDLEWARE
──────────────────────────────────────────────── */

app.use(cookieParser());
app.use(express.json());

/* ────────────────────────────────────────────────
   RATE LIMITER
──────────────────────────────────────────────── */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
  skip: (req) => req.method === "OPTIONS",
});

app.use(limiter);

/* ────────────────────────────────────────────────
   ROUTES
──────────────────────────────────────────────── */

app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/streak", streakRoutes);
app.use("/reply", replyRoutes);
app.use("/billing", billingRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

/* ────────────────────────────────────────────────
   START SERVER
──────────────────────────────────────────────── */

app.listen(PORT, () => {
  console.log(`🚀 XBoost AI Server running on port ${PORT}`);
});

export default app;
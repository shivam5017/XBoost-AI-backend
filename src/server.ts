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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://xboostai.netlify.app",
  "https://xboost-ai-backend.onrender.com",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.startsWith("chrome-extension://");

    callback(null, isAllowed);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ─── Dodo Webhook — RAW body ──────────────────────────────────────────────────
// CRITICAL: must be registered BEFORE express.json().
// Dodo webhook verification validates against the raw request body.
// header against the raw request body. Parsing it as JSON first will break
// signature verification and return 401 for every webhook.

app.use("/billing/webhook", express.raw({ type: "application/json" }));

// ─── General Middleware ───────────────────────────────────────────────────────

app.use(cookieParser());
app.use(express.json());

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
  skip: (req) => req.method === "OPTIONS",
});

app.use(limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/streak", streakRoutes);
app.use("/reply", replyRoutes);
app.use("/billing", billingRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 XBoost AI Server running on port ${PORT}`);
});

export default app;

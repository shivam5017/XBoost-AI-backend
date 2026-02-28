"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
const ai_1 = __importDefault(require("./routes/ai"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const streak_1 = __importDefault(require("./routes/streak"));
const reply_1 = __importDefault(require("./routes/reply"));
const billing_1 = __importDefault(require("./routes/billing"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4500;
app.set("trust proxy", 1);
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            origin.startsWith("chrome-extension://")) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.options(/.*/, (0, cors_1.default)(corsOptions));
// ─── Dodo Webhook — RAW body ──────────────────────────────────────────────────
// CRITICAL: must be registered BEFORE express.json().
// Dodo webhook verification validates against the raw request body.
// header against the raw request body. Parsing it as JSON first will break
// signature verification and return 401 for every webhook.
app.use("/billing/webhook", express_1.default.raw({ type: "application/json" }));
// ─── General Middleware ───────────────────────────────────────────────────────
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests" },
    skip: (req) => req.method === "OPTIONS",
});
app.use(limiter);
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", auth_1.default);
app.use("/ai", ai_1.default);
app.use("/analytics", analytics_1.default);
app.use("/streak", streak_1.default);
app.use("/reply", reply_1.default);
app.use("/billing", billing_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
});
// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 XBoost AI Server running on port ${PORT}`);
});
exports.default = app;

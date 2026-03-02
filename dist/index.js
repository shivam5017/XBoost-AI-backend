"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const ai_1 = __importDefault(require("./routes/ai"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const streak_1 = __importDefault(require("./routes/streak"));
const reply_1 = __importDefault(require("./routes/reply"));
const billing_1 = __importDefault(require("./routes/billing"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
function isOriginAllowed(origin) {
    if (allowAllCors)
        return true;
    if (allowedOrigins.has(origin))
        return true;
    if (origin.startsWith("chrome-extension://"))
        return true;
    if (/^https:\/\/(www\.)?x\.com$/i.test(origin))
        return true;
    if (/^https:\/\/(www\.)?twitter\.com$/i.test(origin))
        return true;
    return false;
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
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
app.use((0, cors_1.default)(corsOptions));
app.options(/.*/, (0, cors_1.default)(corsOptions));
/* ───────── RAW BODY FOR BILLING WEBHOOK ───────── */
app.use("/billing/webhook", express_1.default.raw({ type: "application/json" }));
/* ───────────────── MIDDLEWARE ───────────────── */
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
/* ───────────────── RATE LIMIT ───────────────── */
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
}));
/* ───────────────── ROUTES ───────────────── */
app.use("/auth", auth_1.default);
app.use("/ai", ai_1.default);
app.use("/analytics", analytics_1.default);
app.use("/streak", streak_1.default);
app.use("/reply", reply_1.default);
app.use("/billing", billing_1.default);
app.use("/admin", admin_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
/* ───────────────── START SERVER ───────────────── */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
exports.default = app;

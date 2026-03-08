"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnectionConfig = exports.prisma = void 0;
exports.getDbPoolStats = getDbPoolStats;
exports.pingDatabase = pingDatabase;
const client_1 = require("../lib/generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
require("dotenv/config");
const globalForPrisma = global;
const pooledDatabaseUrl = process.env.DATABASE_URL_POOLER || process.env.NEON_POOLER_DATABASE_URL;
const directDatabaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const runtimeDatabaseUrl = pooledDatabaseUrl || directDatabaseUrl;
if (!runtimeDatabaseUrl) {
    throw new Error("DATABASE_URL is not set in environment variables");
}
if (process.env.NODE_ENV === "production") {
    try {
        const host = new URL(runtimeDatabaseUrl).hostname;
        if (!host.includes("pooler")) {
            console.warn("[db] Runtime DB URL does not look like Neon pooler URL. Prefer pooled URL in production.");
        }
    }
    catch {
        console.warn("[db] Could not parse runtime DATABASE_URL for pooler validation.");
    }
}
function parseIntEnv(key, fallback) {
    const raw = process.env[key];
    if (!raw)
        return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const pool = new pg_1.default.Pool({
    connectionString: runtimeDatabaseUrl,
    max: parseIntEnv("PGPOOL_MAX", 10),
    min: parseIntEnv("PGPOOL_MIN", 1),
    idleTimeoutMillis: parseIntEnv("PGPOOL_IDLE_TIMEOUT_MS", 10000),
    connectionTimeoutMillis: parseIntEnv("PGPOOL_CONN_TIMEOUT_MS", 10000),
    keepAlive: true,
    keepAliveInitialDelayMillis: parseIntEnv("PGPOOL_KEEPALIVE_INITIAL_DELAY_MS", 10000),
    allowExitOnIdle: true,
});
pool.on("error", (err) => {
    const message = String(err?.message || "");
    const isRecoverableIdleDrop = message.includes("Connection terminated unexpectedly") ||
        message.includes("terminating connection due to administrator command");
    if (isRecoverableIdleDrop) {
        // Neon/pgBouncer can occasionally recycle idle sockets; pool will reconnect on demand.
        console.warn("PostgreSQL pool warning (recoverable):", message);
        return;
    }
    console.error("PostgreSQL pool error:", err);
});
// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    }
    else {
        console.log("✅ Database connected successfully");
        release();
    }
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const basePrisma = new client_1.PrismaClient({
    adapter,
    log: ["error", "warn"],
});
exports.prisma = globalForPrisma.prisma ||
    basePrisma;
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
function getDbPoolStats() {
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
    };
}
async function pingDatabase() {
    const started = Date.now();
    try {
        await exports.prisma.$queryRawUnsafe("SELECT 1");
        return { ok: true, latencyMs: Date.now() - started };
    }
    catch (error) {
        return {
            ok: false,
            latencyMs: Date.now() - started,
            error: error?.message || "Unknown DB error",
        };
    }
}
exports.dbConnectionConfig = {
    usesPoolerUrl: Boolean(pooledDatabaseUrl),
    hasDirectUrl: Boolean(directDatabaseUrl),
};

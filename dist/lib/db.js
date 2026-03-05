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
const db_resilience_1 = require("./db-resilience");
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
    allowExitOnIdle: true,
});
pool.on("error", (err) => {
    console.error("PostgreSQL pool error:", err);
    (0, db_resilience_1.markDbFailure)(err);
});
// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        (0, db_resilience_1.markDbFailure)(err);
    }
    else {
        console.log("✅ Database connected successfully");
        (0, db_resilience_1.markDbSuccess)();
        release();
    }
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const basePrisma = new client_1.PrismaClient({
    adapter,
    log: ["error", "warn"],
});
const dbQueryTimeoutMs = parseIntEnv("DB_QUERY_TIMEOUT_MS", 8000);
const dbRetryAttempts = parseIntEnv("DB_RETRY_ATTEMPTS", 3);
const resilientPrisma = basePrisma.$extends({
    query: {
        $allOperations: async ({ model, operation, args, query }) => {
            if (!(0, db_resilience_1.canServeDbTraffic)()) {
                throw new db_resilience_1.DatabaseUnavailableError("Database temporarily overloaded");
            }
            const label = `${model || "raw"}.${operation}`;
            try {
                const result = await (0, db_resilience_1.withDbRetry)(() => (0, db_resilience_1.withDbTimeout)(query(args), dbQueryTimeoutMs, label), { attempts: dbRetryAttempts, label });
                (0, db_resilience_1.markDbSuccess)();
                return result;
            }
            catch (error) {
                (0, db_resilience_1.markDbFailure)(error);
                throw error;
            }
        },
    },
});
exports.prisma = globalForPrisma.prisma ||
    resilientPrisma;
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
        await (0, db_resilience_1.withDbRetry)(() => (0, db_resilience_1.withDbTimeout)(exports.prisma.$queryRawUnsafe("SELECT 1"), dbQueryTimeoutMs, "health.ping"), { attempts: 2, label: "health.ping" });
        return { ok: true, latencyMs: Date.now() - started };
    }
    catch (error) {
        (0, db_resilience_1.markDbFailure)(error);
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

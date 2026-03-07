import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import 'dotenv/config'; 
import {
  canServeDbTraffic,
  DatabaseUnavailableError,
  markDbFailure,
  markDbSuccess,
  withDbRetry,
  withDbTimeout,
} from "./db-resilience";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const pooledDatabaseUrl =
  process.env.DATABASE_URL_POOLER || process.env.NEON_POOLER_DATABASE_URL;
const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const runtimeDatabaseUrl = pooledDatabaseUrl || directDatabaseUrl;

if (!runtimeDatabaseUrl) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

if (process.env.NODE_ENV === "production") {
  try {
    const host = new URL(runtimeDatabaseUrl).hostname;
    if (!host.includes("pooler")) {
      console.warn(
        "[db] Runtime DB URL does not look like Neon pooler URL. Prefer pooled URL in production.",
      );
    }
  } catch {
    console.warn("[db] Could not parse runtime DATABASE_URL for pooler validation.");
  }
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const pool = new pg.Pool({
  connectionString: runtimeDatabaseUrl,
  max: parseIntEnv("PGPOOL_MAX", 10),
  min: parseIntEnv("PGPOOL_MIN", 1),
  idleTimeoutMillis: parseIntEnv("PGPOOL_IDLE_TIMEOUT_MS", 10_000),
  connectionTimeoutMillis: parseIntEnv("PGPOOL_CONN_TIMEOUT_MS", 10_000),
  keepAlive: true,
  keepAliveInitialDelayMillis: parseIntEnv("PGPOOL_KEEPALIVE_INITIAL_DELAY_MS", 10_000),
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  const message = String((err as Error)?.message || "");
  const isRecoverableIdleDrop =
    message.includes("Connection terminated unexpectedly") ||
    message.includes("terminating connection due to administrator command");

  if (isRecoverableIdleDrop) {
    // Neon/pgBouncer can occasionally recycle idle sockets; pool will reconnect on demand.
    console.warn("PostgreSQL pool warning (recoverable):", message);
    return;
  }

  console.error("PostgreSQL pool error:", err);
  markDbFailure(err);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    markDbFailure(err);
  } else {
    console.log("✅ Database connected successfully");
    markDbSuccess();
    release();
  }
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

const dbQueryTimeoutMs = parseIntEnv("DB_QUERY_TIMEOUT_MS", 8_000);
const dbRetryAttempts = parseIntEnv("DB_RETRY_ATTEMPTS", 3);

const resilientPrisma = (basePrisma as any).$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }: any) => {
      if (!canServeDbTraffic()) {
        throw new DatabaseUnavailableError("Database temporarily overloaded");
      }

      const label = `${model || "raw"}.${operation}`;
      try {
        const result = await withDbRetry(
          () => withDbTimeout(query(args), dbQueryTimeoutMs, label),
          { attempts: dbRetryAttempts, label },
        );
        markDbSuccess();
        return result;
      } catch (error) {
        markDbFailure(error);
        throw error;
      }
    },
  },
}) as PrismaClient;

export const prisma =
  globalForPrisma.prisma ||
  resilientPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function getDbPoolStats(): {
  total: number;
  idle: number;
  waiting: number;
} {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await withDbRetry(
      () => withDbTimeout(prisma.$queryRawUnsafe("SELECT 1"), dbQueryTimeoutMs, "health.ping"),
      { attempts: 2, label: "health.ping" },
    );
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error: any) {
    if (!(error instanceof DatabaseUnavailableError)) {
      markDbFailure(error);
    }
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error?.message || "Unknown DB error",
    };
  }
}

export const dbConnectionConfig = {
  usesPoolerUrl: Boolean(pooledDatabaseUrl),
  hasDirectUrl: Boolean(directDatabaseUrl),
};

type CircuitState = "closed" | "open" | "half_open";

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

const FAILURE_THRESHOLD = parseEnvInt("DB_BREAKER_FAILURE_THRESHOLD", 8);
const OPEN_MS = parseEnvInt("DB_BREAKER_OPEN_MS", 20_000);
const HALF_OPEN_SUCCESS_THRESHOLD = parseEnvInt(
  "DB_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD",
  2,
);

let circuitState: CircuitState = "closed";
let consecutiveFailures = 0;
let openUntilEpochMs = 0;
let halfOpenSuccesses = 0;

export class DatabaseUnavailableError extends Error {
  status = 503 as const;
  code = "DB_UNAVAILABLE" as const;

  constructor(message = "Database temporarily unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientDbError(error: unknown): boolean {
  const code = String((error as any)?.code || "");
  const message = String((error as any)?.message || "").toLowerCase();

  if (error instanceof DatabaseUnavailableError) return true;

  const transientCodes = new Set(["P1001", "P1002", "P1017", "P2024"]);
  if (transientCodes.has(code)) return true;

  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("can't reach database server") ||
    message.includes("connection reset") ||
    message.includes("econnreset") ||
    message.includes("too many connections") ||
    message.includes("connection terminated unexpectedly")
  );
}

export function canServeDbTraffic(): boolean {
  if (circuitState === "closed") return true;

  if (circuitState === "open") {
    if (Date.now() < openUntilEpochMs) return false;
    circuitState = "half_open";
    halfOpenSuccesses = 0;
    return true;
  }

  return true;
}

export function markDbSuccess(): void {
  if (circuitState === "half_open") {
    halfOpenSuccesses += 1;
    if (halfOpenSuccesses >= HALF_OPEN_SUCCESS_THRESHOLD) {
      circuitState = "closed";
      consecutiveFailures = 0;
      halfOpenSuccesses = 0;
      openUntilEpochMs = 0;
    }
    return;
  }

  circuitState = "closed";
  consecutiveFailures = 0;
}

export function markDbFailure(error: unknown): void {
  // Do not count synthetic "circuit already open" errors as fresh failures.
  if (error instanceof DatabaseUnavailableError) return;
  if (!isTransientDbError(error)) return;

  // When already open, do not keep extending cooldown on every request.
  if (circuitState === "open") return;

  if (circuitState === "half_open") {
    circuitState = "open";
    openUntilEpochMs = Date.now() + OPEN_MS;
    halfOpenSuccesses = 0;
    consecutiveFailures = FAILURE_THRESHOLD;
    return;
  }

  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitState = "open";
    openUntilEpochMs = Date.now() + OPEN_MS;
  }
}

export function dbCircuitSnapshot(): {
  state: CircuitState;
  consecutiveFailures: number;
  retryAfterMs: number;
} {
  return {
    state: circuitState,
    consecutiveFailures,
    retryAfterMs:
      circuitState === "open" ? Math.max(0, openUntilEpochMs - Date.now()) : 0,
  };
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? parseEnvInt("DB_RETRY_ATTEMPTS", 3);
  const baseDelayMs = options.baseDelayMs ?? parseEnvInt("DB_RETRY_BASE_MS", 120);
  const maxDelayMs = options.maxDelayMs ?? parseEnvInt("DB_RETRY_MAX_MS", 1000);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (!canServeDbTraffic()) {
      throw new DatabaseUnavailableError("Database temporarily overloaded");
    }

    try {
      const result = await fn();
      markDbSuccess();
      return result;
    } catch (error) {
      lastError = error;
      markDbFailure(error);

      const shouldRetry = isTransientDbError(error) && attempt < attempts;
      if (!shouldRetry) throw error;

      const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      await sleep(backoff);
    }
  }

  throw lastError;
}

export async function withDbTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new DatabaseUnavailableError(`Database timeout: ${label}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

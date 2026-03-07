"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseUnavailableError = void 0;
exports.isTransientDbError = isTransientDbError;
exports.canServeDbTraffic = canServeDbTraffic;
exports.markDbSuccess = markDbSuccess;
exports.markDbFailure = markDbFailure;
exports.dbCircuitSnapshot = dbCircuitSnapshot;
exports.withDbRetry = withDbRetry;
exports.withDbTimeout = withDbTimeout;
const FAILURE_THRESHOLD = parseEnvInt("DB_BREAKER_FAILURE_THRESHOLD", 8);
const OPEN_MS = parseEnvInt("DB_BREAKER_OPEN_MS", 20000);
const HALF_OPEN_SUCCESS_THRESHOLD = parseEnvInt("DB_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD", 2);
let circuitState = "closed";
let consecutiveFailures = 0;
let openUntilEpochMs = 0;
let halfOpenSuccesses = 0;
class DatabaseUnavailableError extends Error {
    constructor(message = "Database temporarily unavailable") {
        super(message);
        this.status = 503;
        this.code = "DB_UNAVAILABLE";
        this.name = "DatabaseUnavailableError";
    }
}
exports.DatabaseUnavailableError = DatabaseUnavailableError;
function parseEnvInt(key, fallback) {
    const raw = process.env[key];
    if (!raw)
        return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isTransientDbError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    if (error instanceof DatabaseUnavailableError)
        return true;
    const transientCodes = new Set(["P1001", "P1002", "P1017", "P2024"]);
    if (transientCodes.has(code))
        return true;
    return (message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("can't reach database server") ||
        message.includes("connection reset") ||
        message.includes("econnreset") ||
        message.includes("too many connections") ||
        message.includes("connection terminated unexpectedly"));
}
function canServeDbTraffic() {
    if (circuitState === "closed")
        return true;
    if (circuitState === "open") {
        if (Date.now() < openUntilEpochMs)
            return false;
        circuitState = "half_open";
        halfOpenSuccesses = 0;
        return true;
    }
    return true;
}
function markDbSuccess() {
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
function markDbFailure(error) {
    // Do not count synthetic "circuit already open" errors as fresh failures.
    if (error instanceof DatabaseUnavailableError)
        return;
    if (!isTransientDbError(error))
        return;
    // When already open, do not keep extending cooldown on every request.
    if (circuitState === "open")
        return;
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
function dbCircuitSnapshot() {
    return {
        state: circuitState,
        consecutiveFailures,
        retryAfterMs: circuitState === "open" ? Math.max(0, openUntilEpochMs - Date.now()) : 0,
    };
}
async function withDbRetry(fn, options = {}) {
    const attempts = options.attempts ?? parseEnvInt("DB_RETRY_ATTEMPTS", 3);
    const baseDelayMs = options.baseDelayMs ?? parseEnvInt("DB_RETRY_BASE_MS", 120);
    const maxDelayMs = options.maxDelayMs ?? parseEnvInt("DB_RETRY_MAX_MS", 1000);
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        if (!canServeDbTraffic()) {
            throw new DatabaseUnavailableError("Database temporarily overloaded");
        }
        try {
            const result = await fn();
            markDbSuccess();
            return result;
        }
        catch (error) {
            lastError = error;
            markDbFailure(error);
            const shouldRetry = isTransientDbError(error) && attempt < attempts;
            if (!shouldRetry)
                throw error;
            const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
            await sleep(backoff);
        }
    }
    throw lastError;
}
async function withDbTimeout(operation, timeoutMs, label) {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new DatabaseUnavailableError(`Database timeout: ${label}`));
        }, timeoutMs);
    });
    try {
        return await Promise.race([operation, timeoutPromise]);
    }
    finally {
        if (timeoutHandle)
            clearTimeout(timeoutHandle);
    }
}

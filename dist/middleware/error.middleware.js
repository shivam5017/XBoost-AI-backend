"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const db_resilience_1 = require("../lib/db-resilience");
function errorHandler(err, req, res, _next) {
    console.error(`[Error] ${err.message}`, err.stack);
    if (err instanceof db_resilience_1.DatabaseTimeoutError) {
        res.status(504).json({
            error: "Database request timed out. Please retry.",
            code: "DB_TIMEOUT",
        });
        return;
    }
    if (err instanceof db_resilience_1.DatabaseUnavailableError) {
        const snapshot = (0, db_resilience_1.dbCircuitSnapshot)();
        res.status(503).json({
            error: "Database temporarily overloaded. Please retry shortly.",
            code: "DB_UNAVAILABLE",
            retryAfterMs: snapshot.retryAfterMs,
        });
        return;
    }
    if ((0, db_resilience_1.isTransientDbError)(err)) {
        if (!(err instanceof db_resilience_1.DatabaseUnavailableError)) {
            (0, db_resilience_1.markDbFailure)(err);
        }
        res.status(502).json({
            error: "Temporary database network issue. Please retry.",
            code: "DB_NETWORK",
        });
        return;
    }
    const status = err.status || 500;
    const message = status < 500 ? err.message : 'Internal server error';
    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbTrafficGuard = dbTrafficGuard;
const db_resilience_1 = require("../lib/db-resilience");
function dbTrafficGuard(req, res, next) {
    if (req.path === "/health") {
        next();
        return;
    }
    if ((0, db_resilience_1.canServeDbTraffic)()) {
        next();
        return;
    }
    const snapshot = (0, db_resilience_1.dbCircuitSnapshot)();
    res.status(503).json({
        error: "Database is temporarily unavailable. Please retry shortly.",
        code: "DB_CIRCUIT_OPEN",
        retryAfterMs: snapshot.retryAfterMs,
    });
}

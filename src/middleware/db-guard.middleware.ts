import { NextFunction, Request, Response } from "express";
import { canServeDbTraffic, dbCircuitSnapshot } from "../lib/db-resilience";

export function dbTrafficGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health") {
    next();
    return;
  }

  if (canServeDbTraffic()) {
    next();
    return;
  }

  const snapshot = dbCircuitSnapshot();
  res.status(503).json({
    error: "Database is temporarily unavailable. Please retry shortly.",
    code: "DB_CIRCUIT_OPEN",
    retryAfterMs: snapshot.retryAfterMs,
  });
}


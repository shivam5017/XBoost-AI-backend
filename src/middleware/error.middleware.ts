import { Request, Response, NextFunction } from 'express';
import {
  DatabaseTimeoutError,
  DatabaseUnavailableError,
  dbCircuitSnapshot,
  isTransientDbError,
  markDbFailure,
} from "../lib/db-resilience";

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof DatabaseTimeoutError) {
    res.status(504).json({
      error: "Database request timed out. Please retry.",
      code: "DB_TIMEOUT",
    });
    return;
  }

  if (err instanceof DatabaseUnavailableError) {
    const snapshot = dbCircuitSnapshot();
    res.status(503).json({
      error: "Database temporarily overloaded. Please retry shortly.",
      code: "DB_UNAVAILABLE",
      retryAfterMs: snapshot.retryAfterMs,
    });
    return;
  }

  if (isTransientDbError(err)) {
    if (!(err instanceof DatabaseUnavailableError)) {
      markDbFailure(err);
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

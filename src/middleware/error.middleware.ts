import { Request, Response, NextFunction } from 'express';
import { DatabaseUnavailableError, dbCircuitSnapshot, isTransientDbError, markDbFailure } from "../lib/db-resilience";

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof DatabaseUnavailableError || isTransientDbError(err)) {
    markDbFailure(err);
    const snapshot = dbCircuitSnapshot();
    res.status(503).json({
      error: "Database is temporarily unavailable. Please retry shortly.",
      code: "DB_UNAVAILABLE",
      retryAfterMs: snapshot.retryAfterMs,
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

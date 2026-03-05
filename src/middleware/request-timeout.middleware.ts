import { NextFunction, Request, Response } from "express";

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);

export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (res.headersSent) return;
    res.status(504).json({
      error: "Request timed out. Please retry.",
      code: "REQUEST_TIMEOUT",
    });
  });

  next();
}


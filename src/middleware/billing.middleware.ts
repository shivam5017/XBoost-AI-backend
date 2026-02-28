import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth";
import { hasPaidAccess } from "../services/billing.service";

export async function requirePaidPlan(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const allowed = await hasPaidAccess(req.userId);
  if (!allowed) {
    res.status(402).json({
      error: "Active paid subscription required",
      code: "BILLING_REQUIRED",
    });
    return;
  }

  next();
}


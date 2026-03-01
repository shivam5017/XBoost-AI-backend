import { Response, NextFunction } from "express";
import { prisma } from "../lib/db";
import { AuthRequest } from "./auth";

const DEFAULT_ADMIN_EMAIL = "shivammalik962@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "shivammalik";

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const configuredEmail = String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const configuredPassword = String(process.env.ADMIN_PANEL_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim();
  const providedPassword =
    String(req.headers["x-admin-password"] || req.headers["x-admin-secret"] || "").trim();

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });

  const email = String(user?.email || "").toLowerCase();
  if (!email || email !== configuredEmail) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  if (!providedPassword || providedPassword !== configuredPassword) {
    res.status(401).json({ error: "Admin password required" });
    return;
  }

  next();
}

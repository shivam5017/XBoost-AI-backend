import { Response, NextFunction } from "express";
import { prisma } from "../lib/db";
import { AuthRequest } from "./auth";

function parseAdminEmails(): Set<string> {
  const raw = String(process.env.ADMIN_EMAILS || "").trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const allowed = parseAdminEmails();
  if (!allowed.size) {
    res.status(403).json({ error: "Admin access is not configured" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });

  const email = String(user?.email || "").toLowerCase();
  if (!email || !allowed.has(email)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

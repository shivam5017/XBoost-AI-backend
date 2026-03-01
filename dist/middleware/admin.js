"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const db_1 = require("../lib/db");
const DEFAULT_ADMIN_EMAIL = "shivammalik962@gmail.com";
async function requireAdmin(req, res, next) {
    if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    const configuredEmail = String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { email: true },
    });
    const email = String(user?.email || "").toLowerCase();
    if (!email || email !== configuredEmail) {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePaidPlan = requirePaidPlan;
const billing_service_1 = require("../services/billing.service");
async function requirePaidPlan(req, res, next) {
    if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    const allowed = await (0, billing_service_1.hasPaidAccess)(req.userId);
    if (!allowed) {
        res.status(402).json({
            error: "Active paid subscription required",
            code: "BILLING_REQUIRED",
        });
        return;
    }
    next();
}

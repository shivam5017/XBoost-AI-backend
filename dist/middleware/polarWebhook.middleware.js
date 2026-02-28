"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPolarWebhook = verifyPolarWebhook;
const billing_service_1 = require("../services/billing.service");
function pickSignature(req) {
    const candidates = [
        req.header("webhook-signature"),
        req.header("polar-signature"),
        req.header("x-polar-signature"),
        req.header("svix-signature"),
    ];
    return candidates.find((value) => Boolean(value?.trim())) || "";
}
function verifyPolarWebhook(req, res, next) {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
        res.status(500).json({ error: "POLAR_WEBHOOK_SECRET is not configured" });
        return;
    }
    if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: "Webhook requires raw request body" });
        return;
    }
    const signature = pickSignature(req);
    if (!signature) {
        res.status(401).json({ error: "Missing webhook signature" });
        return;
    }
    const valid = (0, billing_service_1.verifyWebhookSignature)(req.body, signature);
    if (!valid) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
    }
    next();
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckout = createCheckout;
exports.syncCheckout = syncCheckout;
exports.createPortal = createPortal;
exports.getPlanCatalog = getPlanCatalog;
exports.getPublicPlanCatalog = getPublicPlanCatalog;
exports.getRoadmap = getRoadmap;
exports.getFeatureCatalog = getFeatureCatalog;
exports.getSubscription = getSubscription;
exports.getPaymentHistory = getPaymentHistory;
exports.cancelSubscription = cancelSubscription;
exports.handleWebhook = handleWebhook;
const zod_1 = require("zod");
const enums_1 = require("../lib/generated/prisma/enums");
const db_1 = require("../lib/db");
const billing_service_1 = require("../services/billing.service");
const catalog_service_1 = require("../services/catalog.service");
const timezone_1 = require("../utils/timezone");
const checkoutSchema = zod_1.z.object({
    planId: zod_1.z.enum([enums_1.PlanId.starter, enums_1.PlanId.pro]),
    successUrl: zod_1.z.string().url().optional(),
    cancelUrl: zod_1.z.string().url().optional(),
});
const paymentListSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
const syncCheckoutSchema = zod_1.z.object({
    checkoutId: zod_1.z.string().min(1),
});
async function createCheckout(req, res) {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.userId },
    });
    const email = user?.email;
    if (!email) {
        return res.status(404).json({ error: "User not found" });
    }
    try {
        const origin = String(req.headers.origin || "").trim();
        const appUrl = String(process.env.APP_URL || process.env.WEB_APP_URL || "").trim();
        const base = (origin && /^https?:\/\//i.test(origin) ? origin : "") ||
            (appUrl && /^https?:\/\//i.test(appUrl) ? appUrl : "") ||
            "https://xboostai.netlify.app";
        const successUrl = parsed.data.successUrl || `${base.replace(/\/+$/, "")}/dashboard/billing?checkout=success`;
        const cancelUrl = parsed.data.cancelUrl || `${base.replace(/\/+$/, "")}/dashboard/billing?checkout=cancel`;
        const checkout = await (0, billing_service_1.createCheckoutSession)({
            userId: req.userId,
            email,
            name: user.username,
            planId: parsed.data.planId,
            successUrl,
            cancelUrl,
        });
        return res.json(checkout);
    }
    catch (error) {
        return res
            .status(400)
            .json({ error: error?.message || "Failed to create checkout session" });
    }
}
async function syncCheckout(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    const parsed = syncCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    try {
        const result = await (0, billing_service_1.syncCheckoutForUser)({
            userId: req.userId,
            checkoutId: parsed.data.checkoutId,
        });
        const billing = await (0, billing_service_1.getBillingSnapshot)(req.userId, (0, timezone_1.readTimezoneFromRequest)(req));
        return res.json({
            success: result.handled,
            status: result.type,
            billing,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ error: error?.message || "Failed to sync checkout status" });
    }
}
async function createPortal(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        const portal = await (0, billing_service_1.createCustomerPortalSession)({
            userId: req.userId,
        });
        return res.json(portal);
    }
    catch (error) {
        return res
            .status(400)
            .json({ error: error?.message || "Failed to create customer portal session" });
    }
}
async function getPlanCatalog(_req, res) {
    return res.json(await (0, billing_service_1.getPlans)());
}
async function getPublicPlanCatalog(_req, res) {
    return res.json(await (0, billing_service_1.getPlans)());
}
async function getRoadmap(_req, res) {
    return res.json(await (0, catalog_service_1.listRoadmapItems)(false));
}
async function getFeatureCatalog(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json(await (0, billing_service_1.getFeatureCatalogForUser)(req.userId));
}
async function getSubscription(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    const billing = await (0, billing_service_1.getBillingSnapshot)(req.userId, (0, timezone_1.readTimezoneFromRequest)(req));
    return res.json(billing);
}
async function getPaymentHistory(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    const parsed = paymentListSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    const payments = await (0, billing_service_1.listPayments)(req.userId, parsed.data.limit ?? 20);
    return res.json(payments);
}
async function cancelSubscription(req, res) {
    if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        await (0, billing_service_1.cancelSubscriptionAtPeriodEnd)(req.userId);
        const billing = await (0, billing_service_1.getBillingSnapshot)(req.userId, (0, timezone_1.readTimezoneFromRequest)(req));
        return res.json({
            success: true,
            subscription: billing.subscription,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ error: error?.message || "Failed to cancel subscription" });
    }
}
async function handleWebhook(req, res) {
    try {
        if (!Buffer.isBuffer(req.body)) {
            return res
                .status(400)
                .json({ error: "Webhook requires raw request body" });
        }
        const payload = (0, billing_service_1.unwrapDodoWebhook)(req.body, req.headers);
        const result = await (0, billing_service_1.processWebhookPayload)(payload);
        return res.json({ received: true, ...result });
    }
    catch (error) {
        return res
            .status(401)
            .json({ error: error?.message || "Failed to verify/process webhook" });
    }
}

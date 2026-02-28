"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = createCheckoutSession;
exports.createCustomerPortalSession = createCustomerPortalSession;
exports.getBillingSnapshot = getBillingSnapshot;
exports.listPayments = listPayments;
exports.getPlans = getPlans;
exports.hasPaidAccess = hasPaidAccess;
exports.cancelSubscriptionAtPeriodEnd = cancelSubscriptionAtPeriodEnd;
exports.unwrapDodoWebhook = unwrapDodoWebhook;
exports.processWebhookPayload = processWebhookPayload;
const dodopayments_1 = __importDefault(require("dodopayments"));
const db_1 = require("../lib/db");
const enums_1 = require("../lib/generated/prisma/enums");
const usage_service_1 = require("./usage.service");
const PLAN_CATALOG = {
    [enums_1.PlanId.free]: {
        id: enums_1.PlanId.free,
        name: "Free",
        price: 0,
        limits: { dailyReplies: 5, dailyTweets: 2 },
        features: { tweets: true, analytics: false },
    },
    [enums_1.PlanId.starter]: {
        id: enums_1.PlanId.starter,
        name: "Starter",
        price: 4.99,
        limits: { dailyReplies: null, dailyTweets: null },
        features: { tweets: true, analytics: false },
    },
    [enums_1.PlanId.pro]: {
        id: enums_1.PlanId.pro,
        name: "Pro",
        price: 9.99,
        limits: { dailyReplies: null, dailyTweets: null },
        features: { tweets: true, analytics: true },
    },
};
const tableAvailabilityCache = {};
function isPrismaUnavailableError(error) {
    const code = error?.code;
    const message = String(error?.message || "");
    return (code === "P1001" || // DB unreachable
        code === "P2021" || // table missing
        code === "P2022" || // column missing
        message.includes("does not exist in the current database") ||
        message.includes("Can't reach database server"));
}
function defaultSubscriptionRow(userId) {
    return {
        id: "local-fallback",
        userId,
        planId: enums_1.PlanId.free,
        status: enums_1.SubscriptionStatus.active,
        dodoCustomerId: null,
        dodoSubscriptionId: null,
        dodoProductId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        gracePeriodEnds: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
    };
}
async function isBillingTableAvailable(table) {
    const cached = tableAvailabilityCache[table];
    if (typeof cached === "boolean") {
        return cached;
    }
    try {
        const rows = (await db_1.prisma.$queryRawUnsafe(`SELECT to_regclass('public."${table}"')::text AS reg`));
        const available = Boolean(rows?.[0]?.reg);
        tableAvailabilityCache[table] = available;
        return available;
    }
    catch {
        tableAvailabilityCache[table] = false;
        return false;
    }
}
function getDodoClient() {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
        throw new Error("DODO_PAYMENTS_API_KEY is not configured");
    }
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT;
    return new dodopayments_1.default({
        bearerToken: apiKey,
        webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || null,
        ...(environment ? { environment } : {}),
    });
}
function mapPlanToProductId(planId) {
    if (planId === enums_1.PlanId.starter) {
        const value = process.env.DODO_STARTER_PRODUCT_ID;
        if (!value)
            throw new Error("DODO_STARTER_PRODUCT_ID is not configured");
        return value;
    }
    if (planId === enums_1.PlanId.pro) {
        const value = process.env.DODO_PRO_PRODUCT_ID;
        if (!value)
            throw new Error("DODO_PRO_PRODUCT_ID is not configured");
        return value;
    }
    throw new Error("Checkout is not required for the free plan");
}
function mapProductToPlan(productId) {
    if (!productId)
        return enums_1.PlanId.free;
    if (productId === process.env.DODO_PRO_PRODUCT_ID)
        return enums_1.PlanId.pro;
    if (productId === process.env.DODO_STARTER_PRODUCT_ID)
        return enums_1.PlanId.starter;
    return enums_1.PlanId.free;
}
function mapDodoStatusToLocal(type, status) {
    const eventType = type.toLowerCase();
    const normalized = (status || "").toLowerCase();
    if (eventType === "subscription.on_hold" || normalized === "on_hold") {
        return enums_1.SubscriptionStatus.on_hold;
    }
    if (eventType === "subscription.renewed") {
        return enums_1.SubscriptionStatus.renewed;
    }
    if (eventType === "subscription.cancelled" ||
        eventType === "subscription.expired" ||
        normalized === "cancelled" ||
        normalized === "expired") {
        return enums_1.SubscriptionStatus.cancelled;
    }
    if (eventType === "subscription.failed" || normalized === "failed") {
        return enums_1.SubscriptionStatus.past_due;
    }
    if (eventType === "subscription.active" || normalized === "active") {
        return enums_1.SubscriptionStatus.active;
    }
    if (normalized === "pending") {
        return enums_1.SubscriptionStatus.trialing;
    }
    return enums_1.SubscriptionStatus.active;
}
function parseDate(dateLike) {
    if (!dateLike)
        return null;
    const d = new Date(dateLike);
    return Number.isNaN(d.getTime()) ? null : d;
}
async function ensureSubscriptionRow(userId) {
    const hasTable = await isBillingTableAvailable("Subscription");
    if (!hasTable) {
        return defaultSubscriptionRow(userId);
    }
    try {
        const existing = await db_1.prisma.subscription.findUnique({ where: { userId } });
        if (existing)
            return existing;
        return await db_1.prisma.subscription.create({
            data: {
                userId,
                planId: enums_1.PlanId.free,
                status: enums_1.SubscriptionStatus.active,
            },
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            return defaultSubscriptionRow(userId);
        }
        throw error;
    }
}
function normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
            normalized[key] = value;
        }
        else if (Array.isArray(value)) {
            normalized[key] = value.join(",");
        }
    }
    return normalized;
}
function readWebhookUserId(data) {
    return data?.metadata?.userId || data?.customer?.metadata?.userId || null;
}
async function resolveWebhookUserId(data) {
    const explicit = readWebhookUserId(data);
    if (explicit)
        return explicit;
    const customerId = data?.customer?.customer_id || data?.customer_id || undefined;
    if (customerId) {
        const hasTable = await isBillingTableAvailable("Subscription");
        if (hasTable) {
            try {
                const byCustomer = await db_1.prisma.subscription.findUnique({
                    where: { dodoCustomerId: customerId },
                    select: { userId: true },
                });
                if (byCustomer?.userId)
                    return byCustomer.userId;
            }
            catch (error) {
                if (!isPrismaUnavailableError(error)) {
                    throw error;
                }
            }
        }
    }
    const email = data?.customer?.email || data?.email || undefined;
    if (!email)
        return null;
    const user = await db_1.prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
    return user?.id ?? null;
}
async function createCheckoutSession(input) {
    const dodo = getDodoClient();
    const productId = mapPlanToProductId(input.planId);
    const fallbackReturnUrl = process.env.DODO_BILLING_RETURN_URL || undefined;
    const response = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: {
            email: input.email,
            ...(input.name ? { name: input.name } : {}),
        },
        metadata: {
            userId: input.userId,
            planId: input.planId,
            ...(input.cancelUrl ? { cancelUrl: input.cancelUrl } : {}),
        },
        return_url: input.successUrl || fallbackReturnUrl,
    });
    return {
        checkoutId: response.session_id,
        checkoutUrl: response.checkout_url ?? null,
        raw: response,
    };
}
async function createCustomerPortalSession(input) {
    const dodo = getDodoClient();
    const subscription = await ensureSubscriptionRow(input.userId);
    if (!subscription.dodoCustomerId) {
        throw new Error("No Dodo customer found for this user yet");
    }
    const response = await dodo.customers.customerPortal.create(subscription.dodoCustomerId, {
        send_email: false,
    });
    return {
        url: response.link,
        raw: response,
    };
}
async function getBillingSnapshot(userId) {
    const subscription = await ensureSubscriptionRow(userId);
    const usage = await getTodayUsage(userId);
    return {
        subscription: {
            planId: subscription.planId,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            isPaidActive: isPaidSubscription(subscription.planId, subscription.status, subscription.currentPeriodEnd, subscription.gracePeriodEnds),
        },
        plan: PLAN_CATALOG[subscription.planId],
        usage,
    };
}
async function listPayments(userId, limit = 20) {
    const hasTable = await isBillingTableAvailable("Payment");
    if (!hasTable)
        return [];
    try {
        return await db_1.prisma.payment.findMany({
            where: { userId, provider: "dodo_payments" },
            orderBy: { createdAt: "desc" },
            take: Math.max(1, Math.min(limit, 100)),
            select: {
                id: true,
                planId: true,
                amount: true,
                currency: true,
                status: true,
                createdAt: true,
                dodoPaymentId: true,
                dodoInvoiceId: true,
            },
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            return [];
        }
        throw error;
    }
}
function getPlans() {
    return [PLAN_CATALOG.free, PLAN_CATALOG.starter, PLAN_CATALOG.pro];
}
async function getTodayUsage(userId) {
    const hasTable = await isBillingTableAvailable("DailyStats");
    if (!hasTable) {
        const fallback = PLAN_CATALOG[enums_1.PlanId.free].limits;
        return {
            repliesCount: 0,
            tweetsCount: 0,
            remainingReplies: fallback.dailyReplies,
            remainingTweets: fallback.dailyTweets,
        };
    }
    try {
        const usage = await (0, usage_service_1.getDailyUsageSnapshot)(userId);
        return {
            repliesCount: usage.repliesCount,
            tweetsCount: usage.tweetsCount,
            remainingReplies: usage.remainingReplies,
            remainingTweets: usage.remainingTweets,
        };
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            const fallback = PLAN_CATALOG[enums_1.PlanId.free].limits;
            return {
                repliesCount: 0,
                tweetsCount: 0,
                remainingReplies: fallback.dailyReplies,
                remainingTweets: fallback.dailyTweets,
            };
        }
        throw error;
    }
}
function isPaidSubscription(planId, status, periodEnd, gracePeriodEnds) {
    if (planId === enums_1.PlanId.free)
        return false;
    const now = new Date();
    if (status === enums_1.SubscriptionStatus.on_hold && gracePeriodEnds) {
        return gracePeriodEnds > now;
    }
    const allowed = new Set([
        enums_1.SubscriptionStatus.active,
        enums_1.SubscriptionStatus.trialing,
        enums_1.SubscriptionStatus.renewed,
    ]);
    if (!allowed.has(status))
        return false;
    if (!periodEnd)
        return true;
    return periodEnd > now;
}
async function hasPaidAccess(userId) {
    const subscription = await ensureSubscriptionRow(userId);
    return isPaidSubscription(subscription.planId, subscription.status, subscription.currentPeriodEnd, subscription.gracePeriodEnds);
}
async function cancelSubscriptionAtPeriodEnd(userId) {
    const dodo = getDodoClient();
    const subscription = await ensureSubscriptionRow(userId);
    if (!subscription.dodoSubscriptionId) {
        throw new Error("No active Dodo subscription found");
    }
    await dodo.subscriptions.update(subscription.dodoSubscriptionId, {
        cancel_at_next_billing_date: true,
    });
    try {
        await db_1.prisma.subscription.update({
            where: { userId },
            data: {
                cancelAtPeriodEnd: true,
                status: subscription.status === enums_1.SubscriptionStatus.cancelled
                    ? enums_1.SubscriptionStatus.cancelled
                    : subscription.status,
            },
        });
    }
    catch (error) {
        if (!isPrismaUnavailableError(error)) {
            throw error;
        }
    }
}
function unwrapDodoWebhook(rawBody, headers) {
    const dodo = getDodoClient();
    const body = rawBody.toString("utf8");
    return dodo.webhooks.unwrap(body, {
        headers: normalizeHeaders(headers),
    });
}
async function processWebhookPayload(payload) {
    const type = String(payload?.type || "unknown");
    const data = payload?.data ?? payload;
    const userId = await resolveWebhookUserId(data);
    if (!userId) {
        return { handled: false, type };
    }
    const customerId = data?.customer?.customer_id || data?.customer_id || null;
    const subscriptionId = data?.subscription_id || data?.subscription?.subscription_id || null;
    const productId = data?.product_id || data?.subscription?.product_id || null;
    const planId = data?.metadata?.planId || mapProductToPlan(productId);
    const status = mapDodoStatusToLocal(type, data?.status);
    const currentPeriodStart = parseDate(data?.previous_billing_date);
    const currentPeriodEnd = parseDate(data?.next_billing_date);
    const cancelAtPeriodEnd = Boolean(data?.cancel_at_next_billing_date);
    const hasSubscriptionTable = await isBillingTableAvailable("Subscription");
    if (!hasSubscriptionTable) {
        return { handled: false, type, userId };
    }
    try {
        await db_1.prisma.subscription.upsert({
            where: { userId },
            create: {
                userId,
                planId,
                status,
                dodoCustomerId: customerId,
                dodoSubscriptionId: subscriptionId,
                dodoProductId: productId,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd,
                gracePeriodEnds: status === enums_1.SubscriptionStatus.on_hold
                    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    : null,
            },
            update: {
                planId,
                status,
                dodoCustomerId: customerId,
                dodoSubscriptionId: subscriptionId,
                dodoProductId: productId,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd,
                gracePeriodEnds: status === enums_1.SubscriptionStatus.on_hold
                    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    : null,
            },
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            return { handled: false, type, userId };
        }
        throw error;
    }
    if (type.startsWith("payment.")) {
        const hasPaymentTable = await isBillingTableAvailable("Payment");
        if (!hasPaymentTable) {
            return { handled: true, type, userId };
        }
        const paymentId = data?.payment_id || null;
        let existing = null;
        if (paymentId) {
            try {
                existing = await db_1.prisma.payment.findFirst({
                    where: { dodoPaymentId: paymentId, provider: "dodo_payments" },
                    select: { id: true },
                });
            }
            catch (error) {
                if (!isPrismaUnavailableError(error)) {
                    throw error;
                }
            }
        }
        if (!existing) {
            const totalAmount = Number(data?.total_amount ?? 0);
            try {
                await db_1.prisma.payment.create({
                    data: {
                        userId,
                        planId,
                        amount: totalAmount > 0 ? totalAmount / 100 : 0,
                        currency: String(data?.currency || "usd").toLowerCase(),
                        status: String(data?.status || "succeeded").toLowerCase(),
                        provider: "dodo_payments",
                        dodoPaymentId: paymentId,
                        dodoInvoiceId: data?.invoice_id || null,
                    },
                });
            }
            catch (error) {
                if (!isPrismaUnavailableError(error)) {
                    throw error;
                }
            }
        }
    }
    return { handled: true, type, userId };
}

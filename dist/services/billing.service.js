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
exports.getFeatureCatalogForPlan = getFeatureCatalogForPlan;
exports.getFeatureCatalogForUser = getFeatureCatalogForUser;
exports.hasFeatureAccess = hasFeatureAccess;
exports.hasPaidAccess = hasPaidAccess;
exports.cancelSubscriptionAtPeriodEnd = cancelSubscriptionAtPeriodEnd;
exports.unwrapDodoWebhook = unwrapDodoWebhook;
exports.processWebhookPayload = processWebhookPayload;
exports.syncCheckoutForUser = syncCheckoutForUser;
const dodopayments_1 = __importDefault(require("dodopayments"));
const db_1 = require("../lib/db");
const enums_1 = require("../lib/generated/prisma/enums");
const usage_service_1 = require("./usage.service");
const catalog_service_1 = require("./catalog.service");
const FEATURE_CATALOG = [
    {
        id: "viralScorePredictor",
        name: "Viral Score Predictor",
        description: "Score post virality probability with factor-level breakdown before publishing.",
        availability: "live",
        minimumPlan: enums_1.PlanId.starter,
    },
    {
        id: "bestTimeToPost",
        name: "Best Time to Post",
        description: "Recommend top posting windows using behavior and performance patterns.",
        availability: "live",
        minimumPlan: enums_1.PlanId.starter,
    },
    {
        id: "contentPerformancePrediction",
        name: "Content Performance Prediction",
        description: "Forecast engagement range and recommend edits to improve expected outcomes.",
        availability: "live",
        minimumPlan: enums_1.PlanId.starter,
    },
    {
        id: "viralHookIntelligence",
        name: "Viral Hook Intelligence Engine",
        description: "Analyze top niche hooks, score hook quality, and generate A/B hook variants.",
        availability: "live",
        minimumPlan: enums_1.PlanId.starter,
    },
    {
        id: "preLaunchOptimizer",
        name: "Pre-Launch Optimizer",
        description: "Predict engagement range, optimize CTA, and suggest best posting windows before publishing.",
        availability: "live",
        minimumPlan: enums_1.PlanId.starter,
    },
    {
        id: "analytics",
        name: "Analytics Dashboard",
        description: "Growth trend graph, hook-type performance, and engagement efficiency metrics on web.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "nicheTrendRadar",
        name: "Niche Trend Radar",
        description: "Track X niche momentum and surface early trend opportunities.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "growthStrategist",
        name: "AI Growth Strategist Mode",
        description: "30-day roadmap, content pillars, hook bank, and competitor-based strategy guidance.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "brandAnalyzer",
        name: "AI Personal Brand Analyzer",
        description: "Brand voice audit, positioning score, bio rewrite, and monetization direction.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "threadWriterPro",
        name: "AI Thread Writer Pro+",
        description: "Story arc, contrarian angle prompts, CTA layering, and monetization insertion.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "leadMagnetGenerator",
        name: "Auto Lead Magnet Generator",
        description: "Convert content into PDFs, checklists, Notion assets, and mini-course outlines.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "audiencePsychology",
        name: "Audience Psychology Insights",
        description: "Identify emotional and authority triggers that drive follows, saves, and replies.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "repurposingEngine",
        name: "AI Content Repurposing Engine",
        description: "Repurpose X threads into LinkedIn posts, carousels, newsletters, and short-video scripts.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
    {
        id: "monetizationToolkit",
        name: "Creator Monetization Toolkit",
        description: "Offer ideas, pricing strategy, sales threads, and launch calendar planning.",
        availability: "live",
        minimumPlan: enums_1.PlanId.pro,
    },
];
const PLAN_CATALOG = {
    [enums_1.PlanId.free]: {
        id: enums_1.PlanId.free,
        name: "Free",
        price: 0,
        limits: { dailyReplies: 5, dailyTweets: 2 },
        features: {
            tweets: true,
            analytics: false,
            viralScorePredictor: false,
            bestTimeToPost: false,
            contentPerformancePrediction: false,
            viralHookIntelligence: false,
            preLaunchOptimizer: false,
            nicheTrendRadar: false,
            growthStrategist: false,
            brandAnalyzer: false,
            threadWriterPro: false,
            leadMagnetGenerator: false,
            audiencePsychology: false,
            repurposingEngine: false,
            monetizationToolkit: false,
        },
    },
    [enums_1.PlanId.starter]: {
        id: enums_1.PlanId.starter,
        name: "Starter",
        price: 4.99,
        limits: { dailyReplies: null, dailyTweets: null },
        features: {
            tweets: true,
            analytics: false,
            viralScorePredictor: true,
            bestTimeToPost: true,
            contentPerformancePrediction: true,
            viralHookIntelligence: true,
            preLaunchOptimizer: true,
            nicheTrendRadar: false,
            growthStrategist: false,
            brandAnalyzer: false,
            threadWriterPro: false,
            leadMagnetGenerator: false,
            audiencePsychology: false,
            repurposingEngine: false,
            monetizationToolkit: false,
        },
    },
    [enums_1.PlanId.pro]: {
        id: enums_1.PlanId.pro,
        name: "Pro",
        price: 9.99,
        limits: { dailyReplies: null, dailyTweets: null },
        features: {
            tweets: true,
            analytics: true,
            viralScorePredictor: true,
            bestTimeToPost: true,
            contentPerformancePrediction: true,
            viralHookIntelligence: true,
            preLaunchOptimizer: true,
            nicheTrendRadar: true,
            growthStrategist: true,
            brandAnalyzer: true,
            threadWriterPro: true,
            leadMagnetGenerator: true,
            audiencePsychology: true,
            repurposingEngine: true,
            monetizationToolkit: true,
        },
    },
};
const tableAvailabilityCache = {};
function readEnv(...keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (!value)
            continue;
        const normalized = value.trim();
        if (normalized)
            return normalized;
    }
    return undefined;
}
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
    const apiKey = readEnv("DODO_PAYMENTS_API_KEY", "DODO_API_KEY");
    if (!apiKey) {
        throw new Error("Dodo API key is missing (set DODO_PAYMENTS_API_KEY)");
    }
    const environmentRaw = readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT");
    const environment = environmentRaw === "live" ? "live_mode"
        : environmentRaw === "test" ? "test_mode"
            : environmentRaw;
    return new dodopayments_1.default({
        bearerToken: apiKey,
        webhookKey: readEnv("DODO_PAYMENTS_WEBHOOK_KEY", "DODO_WEBHOOK_KEY") || null,
        ...(environment ? { environment } : {}),
    });
}
function mapPlanToProductId(planId) {
    if (planId === enums_1.PlanId.starter) {
        const value = readEnv("DODO_STARTER_PRODUCT_ID", "DODO_STARTER_PRICE_ID");
        if (!value)
            throw new Error("Starter product id is missing (set DODO_STARTER_PRODUCT_ID)");
        return value;
    }
    if (planId === enums_1.PlanId.pro) {
        const value = readEnv("DODO_PRO_PRODUCT_ID", "DODO_PRO_PRICE_ID");
        if (!value)
            throw new Error("Pro product id is missing (set DODO_PRO_PRODUCT_ID)");
        return value;
    }
    throw new Error("Checkout is not required for the free plan");
}
function mapProductToPlan(productId) {
    if (!productId)
        return enums_1.PlanId.free;
    if (productId === readEnv("DODO_PRO_PRODUCT_ID", "DODO_PRO_PRICE_ID"))
        return enums_1.PlanId.pro;
    if (productId === readEnv("DODO_STARTER_PRODUCT_ID", "DODO_STARTER_PRICE_ID"))
        return enums_1.PlanId.starter;
    return enums_1.PlanId.free;
}
function isDodoUnauthorized(error) {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status ?? error?.statusCode ?? 0);
    return status === 401 || message.includes("401");
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
function normalizeBaseUrl(url) {
    if (!url)
        return null;
    const v = String(url).trim();
    if (!v)
        return null;
    return v.replace(/\/+$/, "");
}
function defaultBillingReturnUrl() {
    const explicit = normalizeBaseUrl(readEnv("DODO_BILLING_RETURN_URL"));
    if (explicit)
        return explicit;
    const app = normalizeBaseUrl(readEnv("APP_URL", "WEB_APP_URL", "NEXT_PUBLIC_APP_URL"));
    if (app)
        return `${app}/dashboard/billing?checkout=return`;
    return "https://xboostai.netlify.app/dashboard/billing?checkout=return";
}
function readProductId(data) {
    return (data?.product_id ||
        data?.subscription?.product_id ||
        data?.product_cart?.[0]?.product_id ||
        data?.items?.[0]?.product_id ||
        null);
}
function readPaymentAmount(data) {
    const totalAmount = Number(data?.total_amount ?? data?.amount ?? 0);
    return totalAmount > 0 ? totalAmount / 100 : 0;
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
    return (data?.metadata?.userId ||
        data?.metadata?.user_id ||
        data?.customer?.metadata?.userId ||
        data?.customer?.metadata?.user_id ||
        data?.subscription?.metadata?.userId ||
        data?.subscription?.metadata?.user_id ||
        null);
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
    const fallbackReturnUrl = defaultBillingReturnUrl();
    let response;
    try {
        response = await dodo.checkoutSessions.create({
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
            feature_flags: {
                redirect_immediately: true,
            },
            // SDK types expose redirect control under feature_flags for checkout sessions.
            // Keep top-level flag too for API compatibility across versions.
            ...{ redirect_immediately: true },
        });
    }
    catch (error) {
        if (isDodoUnauthorized(error)) {
            throw new Error("Dodo auth failed. Verify DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_ENVIRONMENT (test_mode/live_mode) match your product IDs.");
        }
        throw error;
    }
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
    let response;
    try {
        response = await dodo.customers.customerPortal.create(subscription.dodoCustomerId, {
            send_email: false,
        });
    }
    catch (error) {
        if (isDodoUnauthorized(error)) {
            throw new Error("Dodo auth failed. Verify DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_ENVIRONMENT (test_mode/live_mode).");
        }
        throw error;
    }
    return {
        url: response.link,
        raw: response,
    };
}
async function getBillingSnapshot(userId, timeZone = "UTC") {
    const subscription = await ensureSubscriptionRow(userId);
    const usage = await getTodayUsage(userId, timeZone);
    const effectivePlan = isPaidSubscription(subscription.planId, subscription.status, subscription.currentPeriodEnd, subscription.gracePeriodEnds)
        ? subscription.planId
        : enums_1.PlanId.free;
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
        features: await getFeatureCatalogForPlan(effectivePlan),
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
function hasPlanFeature(planId, featureId) {
    if (featureId === "analytics") {
        return PLAN_CATALOG[planId].features.analytics;
    }
    return Boolean(PLAN_CATALOG[planId].features[featureId]);
}
async function getFeatureCatalogForPlan(planId) {
    const overrides = await (0, catalog_service_1.getModuleConfigMap)();
    return FEATURE_CATALOG
        .map((feature) => {
        const override = overrides[feature.id];
        if (override && override.isVisible === false)
            return null;
        return {
            id: feature.id,
            name: override?.name || feature.name,
            description: override?.description || feature.description,
            availability: (override?.availability === "coming_soon" || override?.availability === "live")
                ? override.availability
                : feature.availability,
            minimumPlan: override?.minimumPlan || feature.minimumPlan,
            enabled: hasPlanFeature(planId, feature.id),
        };
    })
        .filter((item) => Boolean(item));
}
async function getFeatureCatalogForUser(userId) {
    const subscription = await ensureSubscriptionRow(userId);
    const effectivePlan = isPaidSubscription(subscription.planId, subscription.status, subscription.currentPeriodEnd, subscription.gracePeriodEnds)
        ? subscription.planId
        : enums_1.PlanId.free;
    return getFeatureCatalogForPlan(effectivePlan);
}
async function hasFeatureAccess(userId, featureId) {
    const features = await getFeatureCatalogForUser(userId);
    const target = features.find((f) => f.id === featureId);
    return Boolean(target?.enabled);
}
async function getTodayUsage(userId, timeZone = "UTC") {
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
        const usage = await (0, usage_service_1.getDailyUsageSnapshotForTimezone)(userId, timeZone);
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
    const webhookKey = readEnv("DODO_PAYMENTS_WEBHOOK_KEY", "DODO_WEBHOOK_KEY");
    if (!webhookKey) {
        return dodo.webhooks.unsafeUnwrap(body);
    }
    try {
        return dodo.webhooks.unwrap(body, {
            headers: normalizeHeaders(headers),
            key: webhookKey,
        });
    }
    catch (error) {
        const isTestMode = readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT") === "test_mode" ||
            readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT") === "test";
        if (isTestMode) {
            return dodo.webhooks.unsafeUnwrap(body);
        }
        throw error;
    }
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
    const productId = readProductId(data);
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
            try {
                await db_1.prisma.payment.create({
                    data: {
                        userId,
                        planId,
                        amount: readPaymentAmount(data),
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
async function syncCheckoutForUser(input) {
    if (!input.checkoutId) {
        throw new Error("checkoutId is required");
    }
    const dodo = getDodoClient();
    const user = await db_1.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true },
    });
    if (!user) {
        throw new Error("User not found");
    }
    const checkout = await dodo.checkoutSessions.retrieve(input.checkoutId);
    const paymentId = checkout?.payment_id || null;
    const checkoutEmail = (checkout?.customer_email || "").toLowerCase();
    if (checkoutEmail && checkoutEmail !== user.email.toLowerCase()) {
        throw new Error("Checkout session does not belong to authenticated user");
    }
    if (!paymentId) {
        return {
            handled: false,
            type: "checkout.pending",
            userId: input.userId,
        };
    }
    const payment = await dodo.payments.retrieve(paymentId);
    const paymentStatus = String(payment?.status || checkout?.payment_status || "").toLowerCase();
    if (paymentStatus === "failed" || paymentStatus === "cancelled") {
        return {
            handled: false,
            type: "checkout.failed",
            userId: input.userId,
        };
    }
    const subscriptionId = payment?.subscription_id || null;
    const paymentCustomerId = payment?.customer?.customer_id || null;
    const paymentProductId = readProductId(payment);
    const planId = mapProductToPlan(paymentProductId);
    const hasSubscriptionTable = await isBillingTableAvailable("Subscription");
    if (!hasSubscriptionTable) {
        return { handled: false, type: "checkout.synced", userId: input.userId };
    }
    let status = enums_1.SubscriptionStatus.active;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    let cancelAtPeriodEnd = false;
    let finalProductId = paymentProductId;
    if (subscriptionId) {
        const remoteSubscription = await dodo.subscriptions.retrieve(subscriptionId);
        status = mapDodoStatusToLocal("subscription.updated", remoteSubscription?.status);
        currentPeriodStart = parseDate(remoteSubscription?.previous_billing_date);
        currentPeriodEnd = parseDate(remoteSubscription?.next_billing_date);
        cancelAtPeriodEnd = Boolean(remoteSubscription?.cancelled_at);
        finalProductId = remoteSubscription?.product_id || finalProductId;
    }
    else if (paymentStatus !== "succeeded") {
        return {
            handled: false,
            type: "checkout.pending",
            userId: input.userId,
        };
    }
    await db_1.prisma.subscription.upsert({
        where: { userId: input.userId },
        create: {
            userId: input.userId,
            planId: mapProductToPlan(finalProductId),
            status,
            dodoCustomerId: paymentCustomerId,
            dodoSubscriptionId: subscriptionId,
            dodoProductId: finalProductId,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            gracePeriodEnds: null,
        },
        update: {
            planId: mapProductToPlan(finalProductId),
            status,
            dodoCustomerId: paymentCustomerId,
            dodoSubscriptionId: subscriptionId,
            dodoProductId: finalProductId,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            gracePeriodEnds: null,
        },
    });
    const hasPaymentTable = await isBillingTableAvailable("Payment");
    if (hasPaymentTable) {
        const existing = await db_1.prisma.payment.findFirst({
            where: { dodoPaymentId: paymentId, provider: "dodo_payments" },
            select: { id: true },
        });
        if (!existing) {
            await db_1.prisma.payment.create({
                data: {
                    userId: input.userId,
                    planId: mapProductToPlan(finalProductId) || planId,
                    amount: readPaymentAmount(payment),
                    currency: String(payment?.currency || "usd").toLowerCase(),
                    status: String(payment?.status || "succeeded").toLowerCase(),
                    provider: "dodo_payments",
                    dodoPaymentId: paymentId,
                    dodoInvoiceId: payment?.invoice_id || null,
                },
            });
        }
    }
    return { handled: true, type: "checkout.synced", userId: input.userId };
}

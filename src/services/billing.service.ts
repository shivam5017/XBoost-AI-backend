import type { IncomingHttpHeaders } from "http";
import DodoPayments from "dodopayments";
import { prisma } from "../lib/db";
import { PlanId, SubscriptionStatus } from "../lib/generated/prisma/enums";
import { getDailyUsageSnapshotForTimezone } from "./usage.service";
import { getModuleConfigMap } from "./catalog.service";

type CheckoutSessionInput = {
  userId: string;
  email: string;
  name?: string | null;
  planId: PlanId;
  successUrl?: string;
  cancelUrl?: string;
};

type CreateCustomerPortalInput = {
  userId: string;
};

type SyncCheckoutInput = {
  userId: string;
  checkoutId?: string | null;
};

type BillingSnapshot = {
  subscription: {
    planId: PlanId;
    status: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    isPaidActive: boolean;
  };
  plan: PlanDefinition;
  features: FeatureCatalogItem[];
  usage: {
    repliesCount: number;
    tweetsCount: number;
    remainingReplies: number | null;
    remainingTweets: number | null;
  };
};

type WebhookResult = {
  handled: boolean;
  type: string;
  userId?: string;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  price: number;
  currency?: string;
  pricing?: {
    basePrice: number;
    finalPrice: number;
    discountPercent: number;
    discountCode?: string | null;
    discountName?: string | null;
    hasDiscount: boolean;
  };
  limits: {
    dailyReplies: number | null;
    dailyTweets: number | null;
  };
  features: {
    tweets: boolean;
    analytics: boolean;
    viralScorePredictor: boolean;
    bestTimeToPost: boolean;
    contentPerformancePrediction: boolean;
    viralHookIntelligence: boolean;
    preLaunchOptimizer: boolean;
    nicheTrendRadar: boolean;
    growthStrategist: boolean;
    brandAnalyzer: boolean;
    threadWriterPro: boolean;
    leadMagnetGenerator: boolean;
    audiencePsychology: boolean;
    repurposingEngine: boolean;
    monetizationToolkit: boolean;
  };
};

export type FeatureId =
  | "analytics"
  | "viralScorePredictor"
  | "bestTimeToPost"
  | "contentPerformancePrediction"
  | "viralHookIntelligence"
  | "preLaunchOptimizer"
  | "nicheTrendRadar"
  | "growthStrategist"
  | "brandAnalyzer"
  | "threadWriterPro"
  | "leadMagnetGenerator"
  | "audiencePsychology"
  | "repurposingEngine"
  | "monetizationToolkit";

export type FeatureCatalogItem = {
  id: FeatureId;
  name: string;
  description: string;
  availability: "live" | "coming_soon";
  minimumPlan: PlanId;
  enabled: boolean;
};

const FEATURE_CATALOG: Array<Omit<FeatureCatalogItem, "enabled">> = [
  {
    id: "viralScorePredictor",
    name: "Viral Score Predictor",
    description: "Score post virality probability with factor-level breakdown before publishing.",
    availability: "live",
    minimumPlan: PlanId.starter,
  },
  {
    id: "bestTimeToPost",
    name: "Best Time to Post",
    description: "Recommend top posting windows using behavior and performance patterns.",
    availability: "live",
    minimumPlan: PlanId.starter,
  },
  {
    id: "contentPerformancePrediction",
    name: "Content Performance Prediction",
    description: "Forecast engagement range and recommend edits to improve expected outcomes.",
    availability: "live",
    minimumPlan: PlanId.starter,
  },
  {
    id: "viralHookIntelligence",
    name: "Viral Hook Intelligence Engine",
    description: "Analyze top niche hooks, score hook quality, and generate A/B hook variants.",
    availability: "live",
    minimumPlan: PlanId.starter,
  },
  {
    id: "preLaunchOptimizer",
    name: "Pre-Launch Optimizer",
    description: "Predict engagement range, optimize CTA, and suggest best posting windows before publishing.",
    availability: "live",
    minimumPlan: PlanId.starter,
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    description: "Growth trend graph, hook-type performance, and engagement efficiency metrics on web.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "nicheTrendRadar",
    name: "Niche Trend Radar",
    description: "Track X niche momentum and surface early trend opportunities.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "growthStrategist",
    name: "AI Growth Strategist Mode",
    description: "30-day roadmap, content pillars, hook bank, and competitor-based strategy guidance.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "brandAnalyzer",
    name: "AI Personal Brand Analyzer",
    description: "Brand voice audit, positioning score, bio rewrite, and monetization direction.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "threadWriterPro",
    name: "AI Thread Writer Pro+",
    description: "Story arc, contrarian angle prompts, CTA layering, and monetization insertion.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "leadMagnetGenerator",
    name: "Auto Lead Magnet Generator",
    description: "Convert content into PDFs, checklists, Notion assets, and mini-course outlines.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "audiencePsychology",
    name: "Audience Psychology Insights",
    description: "Identify emotional and authority triggers that drive follows, saves, and replies.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "repurposingEngine",
    name: "AI Content Repurposing Engine",
    description: "Repurpose X threads into LinkedIn posts, carousels, newsletters, and short-video scripts.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
  {
    id: "monetizationToolkit",
    name: "Creator Monetization Toolkit",
    description: "Offer ideas, pricing strategy, sales threads, and launch calendar planning.",
    availability: "live",
    minimumPlan: PlanId.pro,
  },
];

const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  [PlanId.free]: {
    id: PlanId.free,
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
  [PlanId.starter]: {
    id: PlanId.starter,
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
  [PlanId.pro]: {
    id: PlanId.pro,
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

let planCatalogCache: { at: number; plans: PlanDefinition[] } | null = null;
const PLAN_CACHE_MS = 60 * 1000;

type BillingTable = "Subscription" | "Payment" | "DailyStats";
const tableAvailabilityCache: Partial<Record<BillingTable, boolean>> = {};

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (!value) continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function isPrismaUnavailableError(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || "");

  return (
    code === "P1001" || // DB unreachable
    code === "P2021" || // table missing
    code === "P2022" || // column missing
    message.includes("does not exist in the current database") ||
    message.includes("Can't reach database server")
  );
}

function defaultSubscriptionRow(userId: string) {
  return {
    id: "local-fallback",
    userId,
    planId: PlanId.free,
    status: SubscriptionStatus.active,
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

async function isBillingTableAvailable(table: BillingTable): Promise<boolean> {
  const cached = tableAvailabilityCache[table];
  if (typeof cached === "boolean") {
    return cached;
  }

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."${table}"')::text AS reg`,
    )) as Array<{ reg: string | null }>;

    const available = Boolean(rows?.[0]?.reg);
    tableAvailabilityCache[table] = available;
    return available;
  } catch {
    tableAvailabilityCache[table] = false;
    return false;
  }
}

function getDodoClient(): DodoPayments {
  const apiKey = readEnv("DODO_PAYMENTS_API_KEY", "DODO_API_KEY");
  if (!apiKey) {
    throw new Error("Dodo API key is missing (set DODO_PAYMENTS_API_KEY)");
  }

  const environmentRaw = readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT");
  const environment = environmentRaw === "live" ? "live_mode"
    : environmentRaw === "test" ? "test_mode"
    : (environmentRaw as "live_mode" | "test_mode" | undefined);

  return new DodoPayments({
    bearerToken: apiKey,
    webhookKey: readEnv("DODO_PAYMENTS_WEBHOOK_KEY", "DODO_WEBHOOK_KEY") || null,
    ...(environment ? { environment } : {}),
  });
}

function mapPlanToProductId(planId: PlanId): string {
  if (planId === PlanId.starter) {
    const value = readEnv("DODO_STARTER_PRODUCT_ID", "DODO_STARTER_PRICE_ID");
    if (!value) throw new Error("Starter product id is missing (set DODO_STARTER_PRODUCT_ID)");
    return value;
  }

  if (planId === PlanId.pro) {
    const value = readEnv("DODO_PRO_PRODUCT_ID", "DODO_PRO_PRICE_ID");
    if (!value) throw new Error("Pro product id is missing (set DODO_PRO_PRODUCT_ID)");
    return value;
  }

  throw new Error("Checkout is not required for the free plan");
}

function mapProductToPlan(productId?: string | null): PlanId {
  if (!productId) return PlanId.free;
  if (productId === readEnv("DODO_PRO_PRODUCT_ID", "DODO_PRO_PRICE_ID")) return PlanId.pro;
  if (productId === readEnv("DODO_STARTER_PRODUCT_ID", "DODO_STARTER_PRICE_ID")) return PlanId.starter;
  return PlanId.free;
}

function isDodoUnauthorized(error: unknown): boolean {
  const message = String((error as any)?.message || "").toLowerCase();
  const status = Number((error as any)?.status ?? (error as any)?.statusCode ?? 0);
  return status === 401 || message.includes("401");
}

function mapDodoStatusToLocal(type: string, status?: string): SubscriptionStatus {
  const eventType = type.toLowerCase();
  const normalized = (status || "").toLowerCase();

  if (eventType === "subscription.on_hold" || normalized === "on_hold") {
    return SubscriptionStatus.on_hold;
  }
  if (eventType === "subscription.renewed") {
    return SubscriptionStatus.renewed;
  }
  if (
    eventType === "subscription.cancelled" ||
    eventType === "subscription.expired" ||
    normalized === "cancelled" ||
    normalized === "expired"
  ) {
    return SubscriptionStatus.cancelled;
  }
  if (eventType === "subscription.failed" || normalized === "failed") {
    return SubscriptionStatus.past_due;
  }
  if (eventType === "subscription.active" || normalized === "active") {
    return SubscriptionStatus.active;
  }
  if (normalized === "pending") {
    return SubscriptionStatus.trialing;
  }

  return SubscriptionStatus.active;
}

function parseDate(dateLike?: string | Date | null): Date | null {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function centsToUsd(value: number): number {
  return Math.round((value / 100) * 100) / 100;
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function priceDiscountPercentFromProduct(product: any): number {
  const discount = Number(product?.price?.discount ?? 0);
  if (!Number.isFinite(discount) || discount <= 0) return 0;
  return Math.max(0, Math.min(100, discount));
}

function getPlanPriceCents(product: any): number {
  const price = product?.price;
  if (!price || typeof price !== "object") return 0;
  if (typeof price.price === "number") return price.price;
  if (typeof price.fixed_price === "number") return price.fixed_price;
  return 0;
}

async function getBestActiveDiscountForProduct(dodo: DodoPayments, productId: string) {
  const now = new Date();
  const candidates: Array<{ percent: number; code: string; name?: string | null }> = [];

  try {
    const page = await dodo.discounts.list({ active: true, product_id: productId, page_size: 100 });
    for (const discount of page.items || []) {
      const expiresAt = discount.expires_at ? new Date(discount.expires_at) : null;
      const notExpired = !expiresAt || expiresAt > now;
      const hasRemainingUsage =
        discount.usage_limit == null || Number(discount.times_used) < Number(discount.usage_limit);
      const isApplicable =
        !Array.isArray(discount.restricted_to) ||
        !discount.restricted_to.length ||
        discount.restricted_to.includes(productId);
      if (!notExpired || !hasRemainingUsage || !isApplicable) continue;

      const percent = discount.type === "percentage" ? Number(discount.amount) / 100 : 0;
      if (!Number.isFinite(percent) || percent <= 0) continue;
      candidates.push({
        percent,
        code: discount.code,
        name: discount.name || null,
      });
    }
  } catch {
    return null;
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.percent - a.percent);
  return candidates[0];
}

async function enrichPlansFromDodo(basePlans: PlanDefinition[]): Promise<PlanDefinition[]> {
  const now = Date.now();
  if (planCatalogCache && now - planCatalogCache.at < PLAN_CACHE_MS) {
    return planCatalogCache.plans;
  }

  let dodo: DodoPayments;
  try {
    dodo = getDodoClient();
  } catch {
    return basePlans;
  }

  const result = [...basePlans];
  const planToProduct: Array<{ planId: PlanId; productId: string }> = [];
  for (const planId of [PlanId.starter, PlanId.pro]) {
    try {
      planToProduct.push({ planId, productId: mapPlanToProductId(planId) });
    } catch {
      // ignore missing plan mapping
    }
  }

  for (const item of planToProduct) {
    try {
      const product = await dodo.products.retrieve(item.productId);
      const currency = String(product?.price?.currency || "usd").toLowerCase();
      const unitPriceCents = Number(getPlanPriceCents(product));
      if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) continue;

      const basePrice = centsToUsd(unitPriceCents);
      const productDiscountPercent = priceDiscountPercentFromProduct(product);
      const activeDiscount = await getBestActiveDiscountForProduct(dodo, item.productId);
      const discountPercent = Math.max(productDiscountPercent, activeDiscount?.percent || 0);
      const finalPrice = roundPrice(basePrice * (1 - discountPercent / 100));

      const idx = result.findIndex((p) => p.id === item.planId);
      if (idx === -1) continue;

      result[idx] = {
        ...result[idx],
        price: finalPrice > 0 ? finalPrice : basePrice,
        currency,
        pricing: {
          basePrice,
          finalPrice: finalPrice > 0 ? finalPrice : basePrice,
          discountPercent,
          discountCode: activeDiscount?.code || null,
          discountName: activeDiscount?.name || null,
          hasDiscount: discountPercent > 0,
        },
      };
    } catch {
      // fallback to local static prices
    }
  }

  planCatalogCache = { at: now, plans: result };
  return result;
}

async function resolvePlanCatalog(): Promise<Record<PlanId, PlanDefinition>> {
  const staticPlans = [PLAN_CATALOG.free, PLAN_CATALOG.starter, PLAN_CATALOG.pro];
  const dynamic = await enrichPlansFromDodo(staticPlans);
  return {
    [PlanId.free]: dynamic.find((p) => p.id === PlanId.free) || PLAN_CATALOG.free,
    [PlanId.starter]: dynamic.find((p) => p.id === PlanId.starter) || PLAN_CATALOG.starter,
    [PlanId.pro]: dynamic.find((p) => p.id === PlanId.pro) || PLAN_CATALOG.pro,
  };
}

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  const v = String(url).trim();
  if (!v) return null;
  return v.replace(/\/+$/, "");
}

function defaultBillingReturnUrl(): string | undefined {
  const explicit = normalizeBaseUrl(readEnv("DODO_BILLING_RETURN_URL"));
  if (explicit) return explicit;

  const app = normalizeBaseUrl(readEnv("APP_URL", "WEB_APP_URL", "NEXT_PUBLIC_APP_URL"));
  if (app) return `${app}/dashboard/billing?checkout=return`;

  return "https://xboostai.netlify.app/dashboard/billing?checkout=return";
}

function readProductId(data: any): string | null {
  return (
    data?.product_id ||
    data?.subscription?.product_id ||
    data?.product_cart?.[0]?.product_id ||
    data?.items?.[0]?.product_id ||
    null
  );
}

function readPaymentAmount(data: any): number {
  const totalAmount = Number(data?.total_amount ?? data?.amount ?? 0);
  return totalAmount > 0 ? totalAmount / 100 : 0;
}

async function ensureSubscriptionRow(userId: string) {
  const hasTable = await isBillingTableAvailable("Subscription");
  if (!hasTable) {
    return defaultSubscriptionRow(userId);
  }

  try {
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (existing) return existing;

    return await prisma.subscription.create({
      data: {
        userId,
        planId: PlanId.free,
        status: SubscriptionStatus.active,
      },
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return defaultSubscriptionRow(userId);
    }
    throw error;
  }
}

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      normalized[key] = value.join(",");
    }
  }

  return normalized;
}

function readWebhookUserId(data: any): string | null {
  return (
    data?.metadata?.userId ||
    data?.metadata?.user_id ||
    data?.customer?.metadata?.userId ||
    data?.customer?.metadata?.user_id ||
    data?.subscription?.metadata?.userId ||
    data?.subscription?.metadata?.user_id ||
    null
  );
}

async function resolveWebhookUserId(data: any): Promise<string | null> {
  const explicit = readWebhookUserId(data);
  if (explicit) return explicit;

  const customerId: string | undefined =
    data?.customer?.customer_id || data?.customer_id || undefined;

  if (customerId) {
    const hasTable = await isBillingTableAvailable("Subscription");
    if (hasTable) {
      try {
        const byCustomer = await prisma.subscription.findUnique({
          where: { dodoCustomerId: customerId },
          select: { userId: true },
        });
        if (byCustomer?.userId) return byCustomer.userId;
      } catch (error) {
        if (!isPrismaUnavailableError(error)) {
          throw error;
        }
      }
    }
  }

  const email: string | undefined = data?.customer?.email || data?.email || undefined;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function createCheckoutSession(input: CheckoutSessionInput) {
  const dodo = getDodoClient();
  const productId = mapPlanToProductId(input.planId);
  const fallbackReturnUrl = defaultBillingReturnUrl();
  let response: any;

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
      ...( { redirect_immediately: true } as any ),
    });
  } catch (error) {
    if (isDodoUnauthorized(error)) {
      throw new Error(
        "Dodo auth failed. Verify DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_ENVIRONMENT (test_mode/live_mode) match your product IDs."
      );
    }
    throw error;
  }

  return {
    checkoutId: response.session_id,
    checkoutUrl: response.checkout_url ?? null,
    raw: response,
  };
}

export async function createCustomerPortalSession(input: CreateCustomerPortalInput) {
  const dodo = getDodoClient();
  const subscription = await ensureSubscriptionRow(input.userId);

  if (!subscription.dodoCustomerId) {
    throw new Error("No Dodo customer found for this user yet");
  }

  let response: any;
  try {
    response = await dodo.customers.customerPortal.create(subscription.dodoCustomerId, {
      send_email: false,
    });
  } catch (error) {
    if (isDodoUnauthorized(error)) {
      throw new Error(
        "Dodo auth failed. Verify DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_ENVIRONMENT (test_mode/live_mode)."
      );
    }
    throw error;
  }

  return {
    url: response.link,
    raw: response,
  };
}

export async function getBillingSnapshot(
  userId: string,
  timeZone = "UTC",
): Promise<BillingSnapshot> {
  const subscription = await ensureSubscriptionRow(userId);
  const usage = await getTodayUsage(userId, timeZone);
  const planCatalog = await resolvePlanCatalog();
  const effectivePlan = isPaidSubscription(
    subscription.planId,
    subscription.status,
    subscription.currentPeriodEnd,
    subscription.gracePeriodEnds,
  )
    ? subscription.planId
    : PlanId.free;

  return {
    subscription: {
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isPaidActive: isPaidSubscription(
        subscription.planId,
        subscription.status,
        subscription.currentPeriodEnd,
        subscription.gracePeriodEnds,
      ),
    },
    plan: planCatalog[subscription.planId],
    features: await getFeatureCatalogForPlan(effectivePlan),
    usage,
  };
}

export async function listPayments(userId: string, limit = 20) {
  const hasTable = await isBillingTableAvailable("Payment");
  if (!hasTable) return [];

  try {
    return await prisma.payment.findMany({
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
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getPlans(): Promise<PlanDefinition[]> {
  const planCatalog = await resolvePlanCatalog();
  return [planCatalog.free, planCatalog.starter, planCatalog.pro];
}

function hasPlanFeature(planId: PlanId, featureId: FeatureId): boolean {
  if (featureId === "analytics") {
    return PLAN_CATALOG[planId].features.analytics;
  }
  return Boolean((PLAN_CATALOG[planId].features as Record<string, boolean>)[featureId]);
}

export async function getFeatureCatalogForPlan(planId: PlanId): Promise<FeatureCatalogItem[]> {
  const overrides = await getModuleConfigMap();
  return FEATURE_CATALOG
    .map((feature) => {
      const override = overrides[feature.id];
      if (override && override.isVisible === false) return null;

      return {
        id: feature.id,
        name: override?.name || feature.name,
        description: override?.description || feature.description,
        availability: (override?.availability === "coming_soon" || override?.availability === "live")
          ? override.availability
          : feature.availability,
        minimumPlan: override?.minimumPlan || feature.minimumPlan,
        enabled: hasPlanFeature(planId, feature.id),
      } as FeatureCatalogItem;
    })
    .filter((item): item is FeatureCatalogItem => Boolean(item));
}

export async function getFeatureCatalogForUser(userId: string): Promise<FeatureCatalogItem[]> {
  const subscription = await ensureSubscriptionRow(userId);
  const effectivePlan = isPaidSubscription(
    subscription.planId,
    subscription.status,
    subscription.currentPeriodEnd,
    subscription.gracePeriodEnds,
  )
    ? subscription.planId
    : PlanId.free;

  return getFeatureCatalogForPlan(effectivePlan);
}

export async function hasFeatureAccess(userId: string, featureId: FeatureId): Promise<boolean> {
  const features = await getFeatureCatalogForUser(userId);
  const target = features.find((f) => f.id === featureId);
  return Boolean(target?.enabled);
}

async function getTodayUsage(
  userId: string,
  timeZone = "UTC",
): Promise<{
  repliesCount: number;
  tweetsCount: number;
  remainingReplies: number | null;
  remainingTweets: number | null;
}> {
  const hasTable = await isBillingTableAvailable("DailyStats");
  if (!hasTable) {
    const fallback = PLAN_CATALOG[PlanId.free].limits;
    return {
      repliesCount: 0,
      tweetsCount: 0,
      remainingReplies: fallback.dailyReplies,
      remainingTweets: fallback.dailyTweets,
    };
  }

  try {
    const usage = await getDailyUsageSnapshotForTimezone(userId, timeZone);
    return {
      repliesCount: usage.repliesCount,
      tweetsCount: usage.tweetsCount,
      remainingReplies: usage.remainingReplies,
      remainingTweets: usage.remainingTweets,
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      const fallback = PLAN_CATALOG[PlanId.free].limits;
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

function isPaidSubscription(
  planId: PlanId,
  status: SubscriptionStatus,
  periodEnd: Date | null,
  gracePeriodEnds: Date | null,
): boolean {
  if (planId === PlanId.free) return false;

  const now = new Date();
  if (status === SubscriptionStatus.on_hold && gracePeriodEnds) {
    return gracePeriodEnds > now;
  }

  const allowed = new Set<SubscriptionStatus>([
    SubscriptionStatus.active,
    SubscriptionStatus.trialing,
    SubscriptionStatus.renewed,
  ]);
  if (!allowed.has(status)) return false;

  if (!periodEnd) return true;
  return periodEnd > now;
}

export async function hasPaidAccess(userId: string): Promise<boolean> {
  const subscription = await ensureSubscriptionRow(userId);
  return isPaidSubscription(
    subscription.planId,
    subscription.status,
    subscription.currentPeriodEnd,
    subscription.gracePeriodEnds,
  );
}

export async function cancelSubscriptionAtPeriodEnd(userId: string) {
  const dodo = getDodoClient();
  const subscription = await ensureSubscriptionRow(userId);

  if (!subscription.dodoSubscriptionId) {
    throw new Error("No active Dodo subscription found");
  }

  await dodo.subscriptions.update(subscription.dodoSubscriptionId, {
    cancel_at_next_billing_date: true,
  });

  try {
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        status:
          subscription.status === SubscriptionStatus.cancelled
            ? SubscriptionStatus.cancelled
            : subscription.status,
      },
    });
  } catch (error) {
    if (!isPrismaUnavailableError(error)) {
      throw error;
    }
  }
}

export function unwrapDodoWebhook(rawBody: Buffer, headers: IncomingHttpHeaders) {
  const dodo = getDodoClient();
  const body = rawBody.toString("utf8");
  const webhookKey = readEnv("DODO_PAYMENTS_WEBHOOK_KEY", "DODO_WEBHOOK_KEY");

  if (!webhookKey) {
    return dodo.webhooks.unsafeUnwrap(body) as any;
  }

  try {
    return dodo.webhooks.unwrap(body, {
      headers: normalizeHeaders(headers),
      key: webhookKey,
    }) as any;
  } catch (error) {
    const isTestMode =
      readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT") === "test_mode" ||
      readEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT") === "test";

    if (isTestMode) {
      return dodo.webhooks.unsafeUnwrap(body) as any;
    }

    throw error;
  }
}

export async function processWebhookPayload(payload: any): Promise<WebhookResult> {
  const type = String(payload?.type || "unknown");
  const data = payload?.data ?? payload;
  const userId = await resolveWebhookUserId(data);

  if (!userId) {
    return { handled: false, type };
  }

  const customerId: string | null =
    data?.customer?.customer_id || data?.customer_id || null;
  const subscriptionId: string | null =
    data?.subscription_id || data?.subscription?.subscription_id || null;
  const productId: string | null = readProductId(data);

  const planId: PlanId =
    (data?.metadata?.planId as PlanId | undefined) || mapProductToPlan(productId);

  const status = mapDodoStatusToLocal(type, data?.status);
  const currentPeriodStart = parseDate(data?.previous_billing_date);
  const currentPeriodEnd = parseDate(data?.next_billing_date);
  const cancelAtPeriodEnd = Boolean(data?.cancel_at_next_billing_date);

  const hasSubscriptionTable = await isBillingTableAvailable("Subscription");
  if (!hasSubscriptionTable) {
    return { handled: false, type, userId };
  }

  try {
    await prisma.subscription.upsert({
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
        gracePeriodEnds:
          status === SubscriptionStatus.on_hold
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
        gracePeriodEnds:
          status === SubscriptionStatus.on_hold
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            : null,
      },
    });
  } catch (error) {
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

    const paymentId: string | null = data?.payment_id || null;

    let existing = null;
    if (paymentId) {
      try {
        existing = await prisma.payment.findFirst({
          where: { dodoPaymentId: paymentId, provider: "dodo_payments" },
          select: { id: true },
        });
      } catch (error) {
        if (!isPrismaUnavailableError(error)) {
          throw error;
        }
      }
    }

    if (!existing) {
      try {
        await prisma.payment.create({
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
      } catch (error) {
        if (!isPrismaUnavailableError(error)) {
          throw error;
        }
      }
    }
  }

  return { handled: true, type, userId };
}

export async function syncCheckoutForUser(input: SyncCheckoutInput): Promise<WebhookResult> {
  if (!input.checkoutId) {
    throw new Error("checkoutId is required");
  }

  const dodo = getDodoClient();
  const user = await prisma.user.findUnique({
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

  let status: SubscriptionStatus = SubscriptionStatus.active;
  let currentPeriodStart: Date | null = null;
  let currentPeriodEnd: Date | null = null;
  let cancelAtPeriodEnd = false;
  let finalProductId = paymentProductId;

  if (subscriptionId) {
    const remoteSubscription = await dodo.subscriptions.retrieve(subscriptionId);
    status = mapDodoStatusToLocal("subscription.updated", remoteSubscription?.status);
    currentPeriodStart = parseDate(remoteSubscription?.previous_billing_date);
    currentPeriodEnd = parseDate(remoteSubscription?.next_billing_date);
    cancelAtPeriodEnd = Boolean(remoteSubscription?.cancelled_at);
    finalProductId = remoteSubscription?.product_id || finalProductId;
  } else if (paymentStatus !== "succeeded") {
    return {
      handled: false,
      type: "checkout.pending",
      userId: input.userId,
    };
  }

  await prisma.subscription.upsert({
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
    const existing = await prisma.payment.findFirst({
      where: { dodoPaymentId: paymentId, provider: "dodo_payments" },
      select: { id: true },
    });

    if (!existing) {
      await prisma.payment.create({
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

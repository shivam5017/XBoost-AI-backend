import type { IncomingHttpHeaders } from "http";
import DodoPayments from "dodopayments";
import { prisma } from "../lib/db";
import { PlanId, SubscriptionStatus } from "../lib/generated/prisma/enums";
import { getDailyUsageSnapshot } from "./usage.service";

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
  limits: {
    dailyReplies: number | null;
    dailyTweets: number | null;
  };
  features: {
    tweets: boolean;
    analytics: boolean;
  };
};

const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  [PlanId.free]: {
    id: PlanId.free,
    name: "Free",
    price: 0,
    limits: { dailyReplies: 5, dailyTweets: 2 },
    features: { tweets: true, analytics: false },
  },
  [PlanId.starter]: {
    id: PlanId.starter,
    name: "Starter",
    price: 4.99,
    limits: { dailyReplies: null, dailyTweets: null },
    features: { tweets: true, analytics: false },
  },
  [PlanId.pro]: {
    id: PlanId.pro,
    name: "Pro",
    price: 9.99,
    limits: { dailyReplies: null, dailyTweets: null },
    features: { tweets: true, analytics: true },
  },
};

type BillingTable = "Subscription" | "Payment" | "DailyStats";
const tableAvailabilityCache: Partial<Record<BillingTable, boolean>> = {};

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
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("DODO_PAYMENTS_API_KEY is not configured");
  }

  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "live_mode"
    | "test_mode"
    | undefined;

  return new DodoPayments({
    bearerToken: apiKey,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || null,
    ...(environment ? { environment } : {}),
  });
}

function mapPlanToProductId(planId: PlanId): string {
  if (planId === PlanId.starter) {
    const value = process.env.DODO_STARTER_PRODUCT_ID;
    if (!value) throw new Error("DODO_STARTER_PRODUCT_ID is not configured");
    return value;
  }

  if (planId === PlanId.pro) {
    const value = process.env.DODO_PRO_PRODUCT_ID;
    if (!value) throw new Error("DODO_PRO_PRODUCT_ID is not configured");
    return value;
  }

  throw new Error("Checkout is not required for the free plan");
}

function mapProductToPlan(productId?: string | null): PlanId {
  if (!productId) return PlanId.free;
  if (productId === process.env.DODO_PRO_PRODUCT_ID) return PlanId.pro;
  if (productId === process.env.DODO_STARTER_PRODUCT_ID) return PlanId.starter;
  return PlanId.free;
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
  return data?.metadata?.userId || data?.customer?.metadata?.userId || null;
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

export async function createCustomerPortalSession(input: CreateCustomerPortalInput) {
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

export async function getBillingSnapshot(userId: string): Promise<BillingSnapshot> {
  const subscription = await ensureSubscriptionRow(userId);
  const usage = await getTodayUsage(userId);

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
    plan: PLAN_CATALOG[subscription.planId],
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

export function getPlans(): PlanDefinition[] {
  return [PLAN_CATALOG.free, PLAN_CATALOG.starter, PLAN_CATALOG.pro];
}

async function getTodayUsage(
  userId: string,
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
    const usage = await getDailyUsageSnapshot(userId);
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
  return dodo.webhooks.unwrap(body, {
    headers: normalizeHeaders(headers),
  }) as any;
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
  const productId: string | null = data?.product_id || data?.subscription?.product_id || null;

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
      const totalAmount = Number(data?.total_amount ?? 0);
      try {
        await prisma.payment.create({
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
      } catch (error) {
        if (!isPrismaUnavailableError(error)) {
          throw error;
        }
      }
    }
  }

  return { handled: true, type, userId };
}

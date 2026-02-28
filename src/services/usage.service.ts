import { prisma } from "../lib/db";
import { PlanId, SubscriptionStatus } from "../lib/generated/prisma/enums";

type QuotaType = "reply" | "tweet";

type QuotaCheckResult = {
  allowed: boolean;
  quotaType: QuotaType;
  planId: PlanId;
  used: number;
  limit: number | null;
  remaining: number | null;
};

function isPrismaMissingBillingTable(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || "");
  return (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("does not exist in the current database")
  );
}

function isPrismaMissingUsageTable(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || "");
  return (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("AIUsage") ||
    message.includes("does not exist in the current database")
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSubscriptionPaidAndActive(subscription: {
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  gracePeriodEnds: Date | null;
}): boolean {
  if (subscription.planId === PlanId.free) return false;

  const now = new Date();
  if (
    subscription.status === SubscriptionStatus.on_hold &&
    subscription.gracePeriodEnds
  ) {
    return subscription.gracePeriodEnds > now;
  }

  const activeStates = new Set<SubscriptionStatus>([
    SubscriptionStatus.active,
    SubscriptionStatus.trialing,
    SubscriptionStatus.renewed,
  ]);
  if (!activeStates.has(subscription.status)) return false;

  if (!subscription.currentPeriodEnd) return true;
  return subscription.currentPeriodEnd > now;
}

async function resolveEffectivePlan(userId: string): Promise<PlanId> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        planId: true,
        status: true,
        currentPeriodEnd: true,
        gracePeriodEnds: true,
      },
    });

    if (!subscription) return PlanId.free;
    return isSubscriptionPaidAndActive(subscription)
      ? subscription.planId
      : PlanId.free;
  } catch (error) {
    if (isPrismaMissingBillingTable(error)) {
      return PlanId.free;
    }
    throw error;
  }
}

export async function getEffectivePlan(userId: string): Promise<PlanId> {
  return resolveEffectivePlan(userId);
}

function planDailyLimit(planId: PlanId, quotaType: QuotaType): number | null {
  if (planId !== PlanId.free) return null;
  if (quotaType === "reply") return 5;
  if (quotaType === "tweet") return 2;
  return null;
}

function quotaEndpoint(quotaType: QuotaType): string {
  return quotaType === "reply" ? "/ai/reply" : "/ai/create";
}

async function consumeDailyQuota(
  userId: string,
  quotaType: QuotaType,
  units: number,
): Promise<QuotaCheckResult> {
  const planId = await resolveEffectivePlan(userId);
  const limit = planDailyLimit(planId, quotaType);
  const today = startOfToday();
  const used = await prisma.aIUsage.count({
    where: {
      userId,
      endpoint: quotaEndpoint(quotaType),
      createdAt: { gte: today },
    },
  }).catch((error) => {
    if (isPrismaMissingUsageTable(error)) return 0;
    throw error;
  });

  if (limit === null) {
    return {
      allowed: true,
      quotaType,
      planId,
      used,
      limit: null,
      remaining: null,
    };
  }

  const allowed = used + units <= limit;

  return {
    allowed,
    quotaType,
    planId,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function consumeDailyReplyQuota(
  userId: string,
  units = 1,
): Promise<QuotaCheckResult> {
  return consumeDailyQuota(userId, "reply", units);
}

export async function consumeDailyTweetQuota(
  userId: string,
  units = 1,
): Promise<QuotaCheckResult> {
  return consumeDailyQuota(userId, "tweet", units);
}

export async function getDailyUsageSnapshot(userId: string): Promise<{
  planId: PlanId;
  repliesCount: number;
  tweetsCount: number;
  remainingReplies: number | null;
  remainingTweets: number | null;
}> {
  const planId = await resolveEffectivePlan(userId);
  const replyLimit = planDailyLimit(planId, "reply");
  const tweetLimit = planDailyLimit(planId, "tweet");
  const today = startOfToday();

  const [repliesCount, tweetsCount] = await Promise.all([
    prisma.aIUsage.count({
      where: {
        userId,
        endpoint: "/ai/reply",
        createdAt: { gte: today },
      },
    }).catch((error) => {
      if (isPrismaMissingUsageTable(error)) return 0;
      throw error;
    }),
    prisma.aIUsage.count({
      where: {
        userId,
        endpoint: "/ai/create",
        createdAt: { gte: today },
      },
    }).catch((error) => {
      if (isPrismaMissingUsageTable(error)) return 0;
      throw error;
    }),
  ]);

  return {
    planId,
    repliesCount,
    tweetsCount,
    remainingReplies:
      replyLimit === null ? null : Math.max(0, replyLimit - repliesCount),
    remainingTweets:
      tweetLimit === null ? null : Math.max(0, tweetLimit - tweetsCount),
  };
}

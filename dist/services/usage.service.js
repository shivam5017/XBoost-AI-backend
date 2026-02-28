"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectivePlan = getEffectivePlan;
exports.consumeDailyReplyQuota = consumeDailyReplyQuota;
exports.consumeDailyTweetQuota = consumeDailyTweetQuota;
exports.getDailyUsageSnapshot = getDailyUsageSnapshot;
exports.getDailyUsageSnapshotForTimezone = getDailyUsageSnapshotForTimezone;
const db_1 = require("../lib/db");
const enums_1 = require("../lib/generated/prisma/enums");
const timezone_1 = require("../utils/timezone");
function isPrismaMissingBillingTable(error) {
    const code = error?.code;
    const message = String(error?.message || "");
    return (code === "P2021" ||
        code === "P2022" ||
        message.includes("does not exist in the current database"));
}
function isPrismaMissingUsageTable(error) {
    const code = error?.code;
    const message = String(error?.message || "");
    return (code === "P2021" ||
        code === "P2022" ||
        message.includes("AIUsage") ||
        message.includes("does not exist in the current database"));
}
function isSubscriptionPaidAndActive(subscription) {
    if (subscription.planId === enums_1.PlanId.free)
        return false;
    const now = new Date();
    if (subscription.status === enums_1.SubscriptionStatus.on_hold &&
        subscription.gracePeriodEnds) {
        return subscription.gracePeriodEnds > now;
    }
    const activeStates = new Set([
        enums_1.SubscriptionStatus.active,
        enums_1.SubscriptionStatus.trialing,
        enums_1.SubscriptionStatus.renewed,
    ]);
    if (!activeStates.has(subscription.status))
        return false;
    if (!subscription.currentPeriodEnd)
        return true;
    return subscription.currentPeriodEnd > now;
}
async function resolveEffectivePlan(userId) {
    try {
        const subscription = await db_1.prisma.subscription.findUnique({
            where: { userId },
            select: {
                planId: true,
                status: true,
                currentPeriodEnd: true,
                gracePeriodEnds: true,
            },
        });
        if (!subscription)
            return enums_1.PlanId.free;
        return isSubscriptionPaidAndActive(subscription)
            ? subscription.planId
            : enums_1.PlanId.free;
    }
    catch (error) {
        if (isPrismaMissingBillingTable(error)) {
            return enums_1.PlanId.free;
        }
        throw error;
    }
}
async function getEffectivePlan(userId) {
    return resolveEffectivePlan(userId);
}
function planDailyLimit(planId, quotaType) {
    if (planId !== enums_1.PlanId.free)
        return null;
    if (quotaType === "reply")
        return 5;
    if (quotaType === "tweet")
        return 2;
    return null;
}
function quotaEndpoint(quotaType) {
    return quotaType === "reply" ? "/ai/reply" : "/ai/create";
}
async function consumeDailyQuota(userId, quotaType, units, timeZone = "UTC") {
    const planId = await resolveEffectivePlan(userId);
    const limit = planDailyLimit(planId, quotaType);
    const tz = (0, timezone_1.readTimezone)(timeZone);
    const { start, end } = (0, timezone_1.dayRangeUtcForTimezone)(new Date(), tz);
    const used = await db_1.prisma.aIUsage.count({
        where: {
            userId,
            endpoint: quotaEndpoint(quotaType),
            createdAt: { gte: start, lt: end },
        },
    }).catch((error) => {
        if (isPrismaMissingUsageTable(error))
            return 0;
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
async function consumeDailyReplyQuota(userId, units = 1, timeZone = "UTC") {
    return consumeDailyQuota(userId, "reply", units, timeZone);
}
async function consumeDailyTweetQuota(userId, units = 1, timeZone = "UTC") {
    return consumeDailyQuota(userId, "tweet", units, timeZone);
}
async function getDailyUsageSnapshot(userId) {
    return getDailyUsageSnapshotForTimezone(userId, "UTC");
}
async function getDailyUsageSnapshotForTimezone(userId, timeZone = "UTC") {
    const planId = await resolveEffectivePlan(userId);
    const replyLimit = planDailyLimit(planId, "reply");
    const tweetLimit = planDailyLimit(planId, "tweet");
    const tz = (0, timezone_1.readTimezone)(timeZone);
    const { start, end } = (0, timezone_1.dayRangeUtcForTimezone)(new Date(), tz);
    const [repliesCount, tweetsCount] = await Promise.all([
        db_1.prisma.aIUsage.count({
            where: {
                userId,
                endpoint: "/ai/reply",
                createdAt: { gte: start, lt: end },
            },
        }).catch((error) => {
            if (isPrismaMissingUsageTable(error))
                return 0;
            throw error;
        }),
        db_1.prisma.aIUsage.count({
            where: {
                userId,
                endpoint: "/ai/create",
                createdAt: { gte: start, lt: end },
            },
        }).catch((error) => {
            if (isPrismaMissingUsageTable(error))
                return 0;
            throw error;
        }),
    ]);
    return {
        planId,
        repliesCount,
        tweetsCount,
        remainingReplies: replyLimit === null ? null : Math.max(0, replyLimit - repliesCount),
        remainingTweets: tweetLimit === null ? null : Math.max(0, tweetLimit - tweetsCount),
    };
}

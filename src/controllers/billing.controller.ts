import { z } from "zod";
import { PlanId } from "../lib/generated/prisma/enums";
import { prisma } from "../lib/db";
import {
  cancelSubscriptionAtPeriodEnd,
  createCheckoutSession,
  createCustomerPortalSession,
  getPlans,
  getBillingSnapshot,
  listPayments,
  unwrapDodoWebhook,
  processWebhookPayload,
  syncCheckoutForUser,
} from "../services/billing.service";

const checkoutSchema = z.object({
  planId: z.enum([PlanId.starter, PlanId.pro]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const paymentListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const syncCheckoutSchema = z.object({
  checkoutId: z.string().min(1),
});

export async function createCheckout(req: any, res: any) {
  const parsed = checkoutSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  const email = user?.email;

  if (!email) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const origin = String(req.headers.origin || "").trim();
    const appUrl = String(process.env.APP_URL || process.env.WEB_APP_URL || "").trim();
    const base =
      (origin && /^https?:\/\//i.test(origin) ? origin : "") ||
      (appUrl && /^https?:\/\//i.test(appUrl) ? appUrl : "") ||
      "https://xboostai.netlify.app";
    const successUrl = parsed.data.successUrl || `${base.replace(/\/+$/, "")}/dashboard/billing?checkout=success`;
    const cancelUrl = parsed.data.cancelUrl || `${base.replace(/\/+$/, "")}/dashboard/billing?checkout=cancel`;

    const checkout = await createCheckoutSession({
      userId: req.userId,
      email,
      name: user.username,
      planId: parsed.data.planId,
      successUrl,
      cancelUrl,
    });

    return res.json(checkout);
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error?.message || "Failed to create checkout session" });
  }
}

export async function syncCheckout(req: any, res: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const parsed = syncCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const result = await syncCheckoutForUser({
      userId: req.userId,
      checkoutId: parsed.data.checkoutId,
    });

    const billing = await getBillingSnapshot(req.userId);
    return res.json({
      success: result.handled,
      status: result.type,
      billing,
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error?.message || "Failed to sync checkout status" });
  }
}

export async function createPortal(req: any, res: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const portal = await createCustomerPortalSession({
      userId: req.userId,
    });

    return res.json(portal);
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error?.message || "Failed to create customer portal session" });
  }
}

export async function getPlanCatalog(_req: any, res: any) {
  return res.json(getPlans());
}

export async function getSubscription(req: any, res: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const billing = await getBillingSnapshot(req.userId);
  return res.json(billing);
}

export async function getPaymentHistory(req: any, res: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const parsed = paymentListSchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const payments = await listPayments(
    req.userId,
    parsed.data.limit ?? 20
  );

  return res.json(payments);
}

export async function cancelSubscription(req: any, res: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    await cancelSubscriptionAtPeriodEnd(req.userId);
    const billing = await getBillingSnapshot(req.userId);
    return res.json({
      success: true,
      subscription: billing.subscription,
    });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: error?.message || "Failed to cancel subscription" });
  }
}

export async function handleWebhook(req: any, res: any) {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res
        .status(400)
        .json({ error: "Webhook requires raw request body" });
    }

    const payload = unwrapDodoWebhook(req.body, req.headers);
    const result = await processWebhookPayload(payload);

    return res.json({ received: true, ...result });
  } catch (error: any) {
    return res
      .status(401)
      .json({ error: error?.message || "Failed to verify/process webhook" });
  }
}

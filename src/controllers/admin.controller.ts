import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { PlanId } from "../lib/generated/prisma/enums";
import {
  deleteRoadmapItem,
  deleteTemplate,
  listRoadmapItems,
  listModuleConfigs,
  listPromptConfigs,
  listTemplates,
  upsertRoadmapItem,
  upsertModuleConfig,
  upsertPromptConfig,
  upsertTemplate,
} from "../services/catalog.service";

const templateSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9_\-]+$/),
  label: z.string().min(2).max(120),
  emoji: z.string().min(1).max(8).optional(),
  instruction: z.string().min(10),
  structure: z.string().optional(),
  example: z.string().optional(),
  category: z.string().min(2).max(60).optional(),
  target: z.enum(["tweet", "reply", "both"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

const promptSchema = z.object({
  value: z.string().min(1),
  description: z.string().max(400).optional(),
});

const moduleSchema = z.object({
  name: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  availability: z.enum(["live", "coming_soon"]).optional(),
  minimumPlan: z.enum([PlanId.free, PlanId.starter, PlanId.pro]).optional(),
  isVisible: z.boolean().optional(),
  promptHint: z.string().max(500).optional(),
  inputHelp: z.any().optional(),
  examples: z.any().optional(),
});

const roadmapSchema = z.object({
  key: z.string().min(2).max(80).regex(/^[a-z0-9_\-]+$/),
  name: z.string().min(2).max(140),
  description: z.string().min(8).max(600),
  eta: z.string().max(80).optional(),
  status: z.enum(["upcoming", "active"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export async function getAdminTemplates(_req: AuthRequest, res: Response) {
  const list = await listTemplates();
  res.json(list);
}

export async function saveAdminTemplate(req: AuthRequest, res: Response) {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const item = await upsertTemplate(parsed.data);
    return res.json(item);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to save template" });
  }
}

export async function removeAdminTemplate(req: AuthRequest, res: Response) {
  const slug = String(req.params.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "slug required" });

  try {
    await deleteTemplate(slug);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to delete template" });
  }
}

export async function getAdminPromptConfigs(_req: AuthRequest, res: Response) {
  const list = await listPromptConfigs();
  res.json(list);
}

export async function saveAdminPromptConfig(req: AuthRequest, res: Response) {
  const key = String(req.params.key || "").trim();
  if (!key) return res.status(400).json({ error: "key required" });

  const parsed = promptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const row = await upsertPromptConfig(key, parsed.data.value, parsed.data.description);
    return res.json(row);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to save prompt config" });
  }
}

export async function getAdminModuleConfigs(_req: AuthRequest, res: Response) {
  const list = await listModuleConfigs();
  res.json(list);
}

export async function saveAdminModuleConfig(req: AuthRequest, res: Response) {
  const featureId = String(req.params.featureId || "").trim();
  if (!featureId) return res.status(400).json({ error: "featureId required" });

  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const row = await upsertModuleConfig(featureId, parsed.data);
    return res.json(row);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to save module config" });
  }
}

export async function getAdminRoadmap(_req: AuthRequest, res: Response) {
  const rows = await listRoadmapItems(true);
  res.json(rows);
}

export async function saveAdminRoadmap(req: AuthRequest, res: Response) {
  const parsed = roadmapSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const row = await upsertRoadmapItem(parsed.data);
    return res.json(row);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to save roadmap item" });
  }
}

export async function removeAdminRoadmap(req: AuthRequest, res: Response) {
  const key = String(req.params.key || "").trim();
  if (!key) return res.status(400).json({ error: "key required" });

  try {
    await deleteRoadmapItem(key);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Failed to delete roadmap item" });
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminTemplates = getAdminTemplates;
exports.saveAdminTemplate = saveAdminTemplate;
exports.removeAdminTemplate = removeAdminTemplate;
exports.getAdminPromptConfigs = getAdminPromptConfigs;
exports.saveAdminPromptConfig = saveAdminPromptConfig;
exports.getAdminModuleConfigs = getAdminModuleConfigs;
exports.saveAdminModuleConfig = saveAdminModuleConfig;
const zod_1 = require("zod");
const enums_1 = require("../lib/generated/prisma/enums");
const catalog_service_1 = require("../services/catalog.service");
const templateSchema = zod_1.z.object({
    slug: zod_1.z.string().min(2).max(80).regex(/^[a-z0-9_\-]+$/),
    label: zod_1.z.string().min(2).max(120),
    emoji: zod_1.z.string().min(1).max(8).optional(),
    instruction: zod_1.z.string().min(10),
    structure: zod_1.z.string().optional(),
    example: zod_1.z.string().optional(),
    category: zod_1.z.string().min(2).max(60).optional(),
    target: zod_1.z.enum(["tweet", "reply", "both"]).optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(10000).optional(),
});
const promptSchema = zod_1.z.object({
    value: zod_1.z.string().min(1),
    description: zod_1.z.string().max(400).optional(),
});
const moduleSchema = zod_1.z.object({
    name: zod_1.z.string().max(120).optional(),
    description: zod_1.z.string().max(500).optional(),
    availability: zod_1.z.enum(["live", "coming_soon"]).optional(),
    minimumPlan: zod_1.z.enum([enums_1.PlanId.free, enums_1.PlanId.starter, enums_1.PlanId.pro]).optional(),
    isVisible: zod_1.z.boolean().optional(),
    promptHint: zod_1.z.string().max(500).optional(),
    inputHelp: zod_1.z.any().optional(),
    examples: zod_1.z.any().optional(),
});
async function getAdminTemplates(_req, res) {
    const list = await (0, catalog_service_1.listTemplates)();
    res.json(list);
}
async function saveAdminTemplate(req, res) {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    try {
        const item = await (0, catalog_service_1.upsertTemplate)(parsed.data);
        return res.json(item);
    }
    catch (error) {
        return res.status(400).json({ error: error?.message || "Failed to save template" });
    }
}
async function removeAdminTemplate(req, res) {
    const slug = String(req.params.slug || "").trim();
    if (!slug)
        return res.status(400).json({ error: "slug required" });
    try {
        await (0, catalog_service_1.deleteTemplate)(slug);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(400).json({ error: error?.message || "Failed to delete template" });
    }
}
async function getAdminPromptConfigs(_req, res) {
    const list = await (0, catalog_service_1.listPromptConfigs)();
    res.json(list);
}
async function saveAdminPromptConfig(req, res) {
    const key = String(req.params.key || "").trim();
    if (!key)
        return res.status(400).json({ error: "key required" });
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    try {
        const row = await (0, catalog_service_1.upsertPromptConfig)(key, parsed.data.value, parsed.data.description);
        return res.json(row);
    }
    catch (error) {
        return res.status(400).json({ error: error?.message || "Failed to save prompt config" });
    }
}
async function getAdminModuleConfigs(_req, res) {
    const list = await (0, catalog_service_1.listModuleConfigs)();
    res.json(list);
}
async function saveAdminModuleConfig(req, res) {
    const featureId = String(req.params.featureId || "").trim();
    if (!featureId)
        return res.status(400).json({ error: "featureId required" });
    const parsed = moduleSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }
    try {
        const row = await (0, catalog_service_1.upsertModuleConfig)(featureId, parsed.data);
        return res.json(row);
    }
    catch (error) {
        return res.status(400).json({ error: error?.message || "Failed to save module config" });
    }
}

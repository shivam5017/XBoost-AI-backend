"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveTemplateMap = getActiveTemplateMap;
exports.listTemplates = listTemplates;
exports.upsertTemplate = upsertTemplate;
exports.deleteTemplate = deleteTemplate;
exports.getPromptConfigMap = getPromptConfigMap;
exports.listPromptConfigs = listPromptConfigs;
exports.upsertPromptConfig = upsertPromptConfig;
exports.listModuleConfigs = listModuleConfigs;
exports.getModuleConfigMap = getModuleConfigMap;
exports.upsertModuleConfig = upsertModuleConfig;
exports.getDefaultPromptConfigMap = getDefaultPromptConfigMap;
const db_1 = require("../lib/db");
const DEFAULT_TEMPLATES = [
    {
        slug: "double_definition",
        label: "Double Definition",
        emoji: "🧠",
        instruction: "Use two crisp definitions with contrast. Keep it punchy and screenshot-friendly.",
        structure: "Hook: Most creators confuse consistency with clarity.\\n\\nConsistency is repeating actions.\\nClarity is repeating the right message.",
        example: "Leverage is borrowed trust.\\n\\nAuthority is earned trust.",
        category: "framework",
        target: "both",
        sortOrder: 10,
    },
    {
        slug: "triad_structure",
        label: "Triad Structure",
        emoji: "🔺",
        instruction: "Use a 3-part rhythm to make the idea memorable.",
        structure: "Build in public to earn proof.\\nWrite in public to earn trust.\\nShip in public to earn momentum.",
        example: "Build in public to learn faster.\\nShip faster to learn cheaper.\\nLearn cheaper to scale cleaner.",
        category: "framework",
        target: "tweet",
        sortOrder: 20,
    },
    {
        slug: "extremes",
        label: "Extremes",
        emoji: "⚖️",
        instruction: "Use a clear before/after contrast with concrete benefit.",
        structure: "The extreme:\\nMost people optimize for tools.\\nI optimized for systems.\\nNow output ships daily.",
        example: "The extreme:\\nMost devs optimize for tools.\\nI optimized for systems.\\nNow content ships daily without burnout.",
        category: "framework",
        target: "tweet",
        sortOrder: 30,
    },
    {
        slug: "callout",
        label: "The Callout",
        emoji: "📢",
        instruction: "Challenge identity assumptions with concise punch.",
        structure: "\"I need more motivation.\"\\n\\nNo.\\n\\nYou need a smaller daily system.",
        example: "\"I'm too busy to post.\"\\n\\nNo.\\n\\nYou're under-prioritizing distribution.",
        category: "framework",
        target: "both",
        sortOrder: 40,
    },
    {
        slug: "list_question",
        label: "List + Question",
        emoji: "🧾",
        instruction: "Start with a bold hook, add 5-8 tactical bullets, close with a discussion question.",
        structure: "Hook: Most solo devs don't need more features.\\n\\n- Improve onboarding copy\\n- Add one retention loop\\n- Cut setup friction\\n- Track activation weekly\\n- Fix one bottleneck at a time\\n\\nQuestion: Which one are you fixing first?",
        example: "Most solo devs don't need a bigger roadmap.\\n\\n- Kill tasks with no distribution impact\\n- Ship one loop weekly\\n- Track conversion, not likes\\n- Reduce context switching\\n- Build assets, not one-off posts\\n\\nWhich one are you ignoring right now?",
        category: "list",
        target: "tweet",
        sortOrder: 50,
    },
    {
        slug: "repetition_list",
        label: "Repetition List",
        emoji: "🔁",
        instruction: "Repeat a verb for rhythm and make one final break-line lesson.",
        structure: "Study hooks.\\nStudy pacing.\\nStudy proof.\\nStudy CTA.\\nBlow up your weak drafts.\\nLesson: clarity compounds.",
        example: "Study hooks.\\nStudy pacing.\\nStudy proof.\\nStudy CTA.\\nBlow up your old drafts.\\nThen publish like an operator.",
        category: "list",
        target: "tweet",
        sortOrder: 60,
    },
    {
        slug: "hook_list_takeaway",
        label: "Hook + List + Lesson",
        emoji: "🎯",
        instruction: "One hook, one compact list, one takeaway sentence.",
        structure: "Hook: Most content dies in line one.\\n\\n1) Weak hook\\n2) No proof\\n3) No POV\\n4) No CTA\\n\\nLesson: write for decisions, not impressions.",
        example: "Most content fails before sentence 2.\\n\\n1) Weak first line\\n2) Generic claim\\n3) No proof\\n4) No CTA\\n\\nHook is distribution.",
        category: "framework",
        target: "both",
        sortOrder: 70,
    },
    {
        slug: "split_sentences",
        label: "Split Sentences",
        emoji: "✂️",
        instruction: "Use two short lines where sentence two starts with words from sentence one.",
        structure: "You do not need another growth hack.\\nGrowth hacks won't save unclear positioning.",
        example: "You don't need more tools.\\nMore tools won't fix weak positioning.",
        category: "framework",
        target: "both",
        sortOrder: 80,
    },
    {
        slug: "contrast_v1",
        label: "Contrast Tweet",
        emoji: "🆚",
        instruction: "Frame as don't/need or stop/start contrast.",
        structure: "You don't need more prompts.\\nYou need stronger positioning.\\n\\nStop posting random tips.\\nStart posting repeatable systems.",
        example: "You don't need more prompts.\\nYou need clearer positioning.\\n\\nStop posting tips.\\nStart shipping opinions.",
        category: "contrast",
        target: "both",
        sortOrder: 90,
    },
    {
        slug: "milestone_tweet",
        label: "Milestone Tweet",
        emoji: "🏁",
        instruction: "State a milestone and the repeatable daily actions behind it.",
        structure: "I hit 25k followers in 9 months.\\n\\n- Daily shipping\\n- Daily replying\\n- Daily idea capture\\n\\nLesson: simple loops beat complex plans.",
        example: "I hit 25k followers in 9 months.\\n\\n- Daily shipping\\n- Daily replying\\n- Daily idea capture\\n\\nSimple loops beat complex plans.",
        category: "proof",
        target: "tweet",
        sortOrder: 100,
    },
    {
        slug: "symmetric_comparison",
        label: "Symmetric Comparison",
        emoji: "🪞",
        instruction: "Use two mirrored lists and close with a lesson.",
        structure: "Creators who grow: ship, test, iterate.\\nCreators who stall: plan, delay, overthink.\\nLesson: speed to feedback wins.",
        example: "Creators who grow: ship, test, iterate.\\nCreators who stall: plan, delay, overthink.\\nDifference is speed to feedback.",
        category: "comparison",
        target: "tweet",
        sortOrder: 110,
    },
    {
        slug: "problem_agitate_solve",
        label: "PAS",
        emoji: "🛠️",
        instruction: "Use problem, pain amplification, and practical solution.",
        structure: "Problem: Inconsistent posting.\\nAgitate: Audience forgets you in 48h.\\nSolve: Build a 30-minute daily loop.",
        example: "Problem: Inconsistent posting.\\nAgitate: Your audience forgets you in 48h.\\nSolve: Build a daily 30-minute content loop.",
        category: "copywriting",
        target: "both",
        sortOrder: 120,
    },
    {
        slug: "insight_receipt",
        label: "Insight + Receipt",
        emoji: "🧾",
        instruction: "Make a claim and back it with one concrete metric or example.",
        structure: "Insight: Longer tweets are not the issue.\\nReceipt: 63% of my top posts are under 180 characters.\\nQuestion: Are you optimizing for clarity or length?",
        example: "Longer tweets are not the issue.\\nReceipt: 63% of my top posts are under 180 chars.\\nAre you optimizing for clarity or length?",
        category: "proof",
        target: "both",
        sortOrder: 130,
    },
];
const DEFAULT_PROMPT_CONFIG = {
    generation_guardrails: {
        description: "Global quality constraints for tweet/reply/rewrite generation.",
        value: [
            "- Write like a real person on X, not a robotic marketer.",
            "- Use concrete nouns, specific actions, and strong verbs.",
            "- Avoid cliches, filler, and generic inspiration.",
            "- Prefer fresh angles and contrarian-but-defensible framing.",
            "- Keep outputs concise, punchy, and screenshot-worthy when possible.",
            "- Never return markdown code fences or meta explanation.",
        ].join("\\n"),
    },
    reply_objective: {
        description: "Objective injected into reply generation.",
        value: "Generate one high-signal reply that directly addresses the source post, adds new value, and invites conversation.",
    },
    create_objective: {
        description: "Objective injected into tweet generation.",
        value: "Generate one original tweet with a sharp hook, one actionable insight, and a clear close.",
    },
    rewrite_objective: {
        description: "Objective injected into rewrite generation.",
        value: "Rewrite for stronger hook, tighter pacing, higher specificity, and clearer CTA while preserving intent.",
    },
    tone_catalog_json: {
        description: "JSON object for dynamic tones in compose flows. Example: {\"smart\":\"...\"}",
        value: JSON.stringify({
            smart: "Be insightful, add a unique perspective, and provide value. Sound knowledgeable but approachable.",
            viral: "Make it shareable and punchy. Use a strong hook. Create curiosity or spark emotion. Think retweet-worthy.",
            funny: "Be witty and clever. Use wordplay or unexpected angles. Keep it light and entertaining.",
            controversial: "Take a bold, contrarian stance that invites debate. Be confident. Challenge assumptions.",
            founder: "Sound like a startup founder sharing hard-won lessons. Reference growth, product, execution, or failure.",
            storyteller: "Open with a compelling hook, build tension, and land a punchy conclusion. Make it feel personal.",
            educator: "Break down complex ideas simply. Use analogies. Teach something genuinely useful.",
        }, null, 2),
    },
};
const tableAvailability = {
    PromptTemplate: undefined,
    PromptConfig: undefined,
    ModuleConfig: undefined,
};
function isPrismaUnavailableError(error) {
    const code = error?.code;
    const message = String(error?.message || "");
    return (code === "P2021" ||
        code === "P2022" ||
        code === "P1001" ||
        message.includes("does not exist in the current database") ||
        message.includes("Can't reach database server"));
}
async function isTableAvailable(table) {
    const cached = tableAvailability[table];
    if (typeof cached === "boolean")
        return cached;
    try {
        const rows = (await db_1.prisma.$queryRawUnsafe(`SELECT to_regclass('public."${table}"')::text AS reg`));
        const exists = Boolean(rows?.[0]?.reg);
        tableAvailability[table] = exists;
        return exists;
    }
    catch {
        tableAvailability[table] = false;
        return false;
    }
}
async function seedTemplatesIfEmpty() {
    if (!(await isTableAvailable("PromptTemplate")))
        return;
    try {
        const count = await db_1.prisma.promptTemplate.count();
        if (count > 0)
            return;
        await db_1.prisma.promptTemplate.createMany({
            data: DEFAULT_TEMPLATES.map((tpl) => ({
                slug: tpl.slug,
                label: tpl.label,
                emoji: tpl.emoji || "🧩",
                instruction: tpl.instruction,
                structure: tpl.structure || null,
                example: tpl.example || null,
                category: tpl.category || "general",
                target: tpl.target || "both",
                isActive: tpl.isActive ?? true,
                sortOrder: tpl.sortOrder ?? 0,
            })),
            skipDuplicates: true,
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error))
            return;
        throw error;
    }
}
async function seedPromptConfigIfEmpty() {
    if (!(await isTableAvailable("PromptConfig")))
        return;
    try {
        const count = await db_1.prisma.promptConfig.count();
        if (count > 0)
            return;
        const entries = Object.entries(DEFAULT_PROMPT_CONFIG);
        await db_1.prisma.promptConfig.createMany({
            data: entries.map(([key, item]) => ({
                key,
                value: item.value,
                description: item.description,
            })),
            skipDuplicates: true,
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error))
            return;
        throw error;
    }
}
async function getActiveTemplateMap(target = "all") {
    await seedTemplatesIfEmpty();
    if (!(await isTableAvailable("PromptTemplate"))) {
        return Object.fromEntries(DEFAULT_TEMPLATES
            .filter((t) => t.isActive !== false)
            .filter((t) => target === "all" || t.target === "both" || t.target === target)
            .map((t) => [
            t.slug,
            {
                label: t.label,
                emoji: t.emoji || "🧩",
                instruction: [
                    t.instruction,
                    t.structure ? `Format style:\n${t.structure}` : "",
                    t.example ? `Reference example:\n${t.example}` : "",
                ]
                    .filter(Boolean)
                    .join("\n\n"),
            },
        ]));
    }
    try {
        const rows = await db_1.prisma.promptTemplate.findMany({
            where: {
                isActive: true,
                ...(target === "all" ? {} : { OR: [{ target: "both" }, { target }] }),
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
                slug: true,
                label: true,
                emoji: true,
                instruction: true,
                structure: true,
                example: true,
            },
        });
        return Object.fromEntries(rows.map((row) => [
            row.slug,
            {
                label: row.label,
                emoji: row.emoji,
                instruction: [
                    row.instruction,
                    row.structure ? `Format style:\n${row.structure}` : "",
                    row.example ? `Reference example:\n${row.example}` : "",
                ]
                    .filter(Boolean)
                    .join("\n\n"),
            },
        ]));
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            return Object.fromEntries(DEFAULT_TEMPLATES
                .filter((t) => t.isActive !== false)
                .filter((t) => target === "all" || t.target === "both" || t.target === target)
                .map((t) => [
                t.slug,
                {
                    label: t.label,
                    emoji: t.emoji || "🧩",
                    instruction: [
                        t.instruction,
                        t.structure ? `Format style:\n${t.structure}` : "",
                        t.example ? `Reference example:\n${t.example}` : "",
                    ]
                        .filter(Boolean)
                        .join("\n\n"),
                },
            ]));
        }
        throw error;
    }
}
async function listTemplates() {
    await seedTemplatesIfEmpty();
    if (!(await isTableAvailable("PromptTemplate"))) {
        return DEFAULT_TEMPLATES.map((tpl, idx) => ({
            id: `default-${tpl.slug}-${idx}`,
            slug: tpl.slug,
            label: tpl.label,
            emoji: tpl.emoji || "🧩",
            instruction: tpl.instruction,
            structure: tpl.structure || null,
            example: tpl.example || null,
            category: tpl.category || "general",
            target: tpl.target || "both",
            isActive: tpl.isActive ?? true,
            sortOrder: tpl.sortOrder ?? 0,
        }));
    }
    try {
        return await db_1.prisma.promptTemplate.findMany({
            orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        });
    }
    catch (error) {
        if (isPrismaUnavailableError(error))
            return [];
        throw error;
    }
}
async function upsertTemplate(input) {
    if (!(await isTableAvailable("PromptTemplate"))) {
        throw new Error("PromptTemplate table not available. Run prisma migration/db push.");
    }
    return db_1.prisma.promptTemplate.upsert({
        where: { slug: input.slug },
        create: {
            slug: input.slug,
            label: input.label,
            emoji: input.emoji || "🧩",
            instruction: input.instruction,
            structure: input.structure || null,
            example: input.example || null,
            category: input.category || "general",
            target: input.target || "both",
            isActive: input.isActive ?? true,
            sortOrder: input.sortOrder ?? 0,
        },
        update: {
            label: input.label,
            emoji: input.emoji || "🧩",
            instruction: input.instruction,
            structure: input.structure || null,
            example: input.example || null,
            category: input.category || "general",
            target: input.target || "both",
            isActive: input.isActive ?? true,
            sortOrder: input.sortOrder ?? 0,
        },
    });
}
async function deleteTemplate(slug) {
    if (!(await isTableAvailable("PromptTemplate"))) {
        throw new Error("PromptTemplate table not available. Run prisma migration/db push.");
    }
    await db_1.prisma.promptTemplate.delete({ where: { slug } });
}
async function getPromptConfigMap() {
    await seedPromptConfigIfEmpty();
    if (!(await isTableAvailable("PromptConfig"))) {
        return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
    }
    try {
        const rows = await db_1.prisma.promptConfig.findMany({ orderBy: { key: "asc" } });
        if (!rows.length) {
            return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
        }
        return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    }
    catch (error) {
        if (isPrismaUnavailableError(error)) {
            return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
        }
        throw error;
    }
}
async function listPromptConfigs() {
    await seedPromptConfigIfEmpty();
    if (!(await isTableAvailable("PromptConfig"))) {
        return Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, item]) => ({
            key,
            value: item.value,
            description: item.description,
        }));
    }
    try {
        return await db_1.prisma.promptConfig.findMany({ orderBy: { key: "asc" } });
    }
    catch (error) {
        if (isPrismaUnavailableError(error))
            return [];
        throw error;
    }
}
async function upsertPromptConfig(key, value, description) {
    if (!(await isTableAvailable("PromptConfig"))) {
        throw new Error("PromptConfig table not available. Run prisma migration/db push.");
    }
    return db_1.prisma.promptConfig.upsert({
        where: { key },
        create: { key, value, description: description || null },
        update: { value, description: description || null },
    });
}
async function listModuleConfigs() {
    if (!(await isTableAvailable("ModuleConfig")))
        return [];
    try {
        return await db_1.prisma.moduleConfig.findMany({ orderBy: { id: "asc" } });
    }
    catch (error) {
        if (isPrismaUnavailableError(error))
            return [];
        throw error;
    }
}
async function getModuleConfigMap() {
    const list = await listModuleConfigs();
    return Object.fromEntries(list.map((item) => [item.id, item]));
}
async function upsertModuleConfig(featureId, input) {
    if (!(await isTableAvailable("ModuleConfig"))) {
        throw new Error("ModuleConfig table not available. Run prisma migration/db push.");
    }
    return db_1.prisma.moduleConfig.upsert({
        where: { id: featureId },
        create: {
            id: featureId,
            name: input.name || null,
            description: input.description || null,
            availability: input.availability || null,
            minimumPlan: input.minimumPlan,
            isVisible: input.isVisible ?? true,
            promptHint: input.promptHint || null,
            inputHelp: input.inputHelp,
            examples: input.examples,
        },
        update: {
            name: input.name ?? null,
            description: input.description ?? null,
            availability: input.availability ?? null,
            minimumPlan: input.minimumPlan,
            isVisible: input.isVisible ?? true,
            promptHint: input.promptHint ?? null,
            inputHelp: input.inputHelp,
            examples: input.examples,
        },
    });
}
function getDefaultPromptConfigMap() {
    return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, item]) => [key, item.value]));
}

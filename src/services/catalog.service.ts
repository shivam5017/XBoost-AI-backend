import { prisma } from "../lib/db";
import { PlanId } from "../lib/generated/prisma/enums";

export type TemplateTarget = "tweet" | "reply" | "both";

export type PromptTemplateRecord = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  instruction: string;
  structure: string | null;
  example: string | null;
  category: string;
  target: string;
  isActive: boolean;
  sortOrder: number;
};

export type PromptTemplateInput = {
  slug: string;
  label: string;
  emoji?: string;
  instruction: string;
  structure?: string;
  example?: string;
  category?: string;
  target?: TemplateTarget;
  isActive?: boolean;
  sortOrder?: number;
};

export type ModuleConfigRecord = {
  id: string;
  name: string | null;
  description: string | null;
  availability: string | null;
  minimumPlan: PlanId | null;
  isVisible: boolean;
  promptHint: string | null;
  inputHelp: unknown;
  examples: unknown;
};

const DEFAULT_TEMPLATES: PromptTemplateInput[] = [
  {
    slug: "double_definition",
    label: "Double Definition",
    emoji: "🧠",
    instruction: "Define two related ideas with sharp contrast in short lines.",
    structure: "[A] is [Definition]\\n\\n[B] is [Definition]",
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
    structure: "[A] to/like [Sentence]\\n\\n[B] to/like [Sentence]\\n\\n[C] to/like [Sentence]",
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
    structure: "The [extreme]:\\n[person or topic]\\n[your investment]\\n[the specific benefit]",
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
    structure: "\"I'm [A]\"\\n\\nNo.\\n\\nYou're [B]",
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
    structure: "[Hook]\\n\\n- [Point 1]\\n- [Point 2]\\n- [Point 3]\\n- [Point 4]\\n- [Point 5]\\n\\n[Question]",
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
    structure: "Study [A]\\nStudy [B]\\nStudy [C]\\nStudy [D]\\nBlow [E]\\n[Lesson]",
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
    structure: "[Hook]\\n\\n[List]\\n\\n[Lesson]",
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
    structure: "[Part 1]\\n\\n[Part 2 starts with phrase from Part 1]",
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
    structure: "You don't need [A]\\nYou need [B]\\n\\nStop [A]\\nStart [B]",
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
    structure: "I hit ___ followers ___.\\n\\n- Daily ____\\n- Daily ____\\n- Daily ____\\n\\n[Short lesson]",
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
    structure: "[Hook]\\n\\n[List 1]\\n\\n[List 2]\\n\\n[Lesson]",
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
    structure: "Problem: [A]\\nAgitate: [B]\\nSolve: [C]",
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
    structure: "[Insight]\\nReceipt: [specific metric/example]\\n[CTA/question]",
    example: "Longer tweets are not the issue.\\nReceipt: 63% of my top posts are under 180 chars.\\nAre you optimizing for clarity or length?",
    category: "proof",
    target: "both",
    sortOrder: 130,
  },
];

const DEFAULT_PROMPT_CONFIG: Record<string, { value: string; description: string }> = {
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
    value:
      "Generate one high-signal reply that directly addresses the source post, adds new value, and invites conversation.",
  },
  create_objective: {
    description: "Objective injected into tweet generation.",
    value:
      "Generate one original tweet with a sharp hook, one actionable insight, and a clear close.",
  },
  rewrite_objective: {
    description: "Objective injected into rewrite generation.",
    value:
      "Rewrite for stronger hook, tighter pacing, higher specificity, and clearer CTA while preserving intent.",
  },
};

const tableAvailability: Record<string, boolean | undefined> = {
  PromptTemplate: undefined,
  PromptConfig: undefined,
  ModuleConfig: undefined,
};

function isPrismaUnavailableError(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || "");
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "P1001" ||
    message.includes("does not exist in the current database") ||
    message.includes("Can't reach database server")
  );
}

async function isTableAvailable(table: "PromptTemplate" | "PromptConfig" | "ModuleConfig") {
  const cached = tableAvailability[table];
  if (typeof cached === "boolean") return cached;

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."${table}"')::text AS reg`,
    )) as Array<{ reg: string | null }>;

    const exists = Boolean(rows?.[0]?.reg);
    tableAvailability[table] = exists;
    return exists;
  } catch {
    tableAvailability[table] = false;
    return false;
  }
}

async function seedTemplatesIfEmpty() {
  if (!(await isTableAvailable("PromptTemplate"))) return;

  try {
    const count = await prisma.promptTemplate.count();
    if (count > 0) return;

    await prisma.promptTemplate.createMany({
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
  } catch (error) {
    if (isPrismaUnavailableError(error)) return;
    throw error;
  }
}

async function seedPromptConfigIfEmpty() {
  if (!(await isTableAvailable("PromptConfig"))) return;

  try {
    const count = await prisma.promptConfig.count();
    if (count > 0) return;

    const entries = Object.entries(DEFAULT_PROMPT_CONFIG);
    await prisma.promptConfig.createMany({
      data: entries.map(([key, item]) => ({
        key,
        value: item.value,
        description: item.description,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) return;
    throw error;
  }
}

export async function getActiveTemplateMap(target: TemplateTarget | "all" = "all"): Promise<Record<string, { label: string; emoji: string; instruction: string }>> {
  await seedTemplatesIfEmpty();

  if (!(await isTableAvailable("PromptTemplate"))) {
    return Object.fromEntries(
      DEFAULT_TEMPLATES
        .filter((t) => t.isActive !== false)
        .filter((t) => target === "all" || t.target === "both" || t.target === target)
        .map((t) => [t.slug, { label: t.label, emoji: t.emoji || "🧩", instruction: t.instruction }]),
    );
  }

  try {
    const rows = await prisma.promptTemplate.findMany({
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
      },
    });

    return Object.fromEntries(rows.map((row) => [row.slug, row]));
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return Object.fromEntries(
        DEFAULT_TEMPLATES
          .filter((t) => t.isActive !== false)
          .filter((t) => target === "all" || t.target === "both" || t.target === target)
          .map((t) => [t.slug, { label: t.label, emoji: t.emoji || "🧩", instruction: t.instruction }]),
      );
    }
    throw error;
  }
}

export async function listTemplates(): Promise<PromptTemplateRecord[]> {
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
    return await prisma.promptTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) return [];
    throw error;
  }
}

export async function upsertTemplate(input: PromptTemplateInput): Promise<PromptTemplateRecord> {
  if (!(await isTableAvailable("PromptTemplate"))) {
    throw new Error("PromptTemplate table not available. Run prisma migration/db push.");
  }

  return prisma.promptTemplate.upsert({
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

export async function deleteTemplate(slug: string): Promise<void> {
  if (!(await isTableAvailable("PromptTemplate"))) {
    throw new Error("PromptTemplate table not available. Run prisma migration/db push.");
  }
  await prisma.promptTemplate.delete({ where: { slug } });
}

export async function getPromptConfigMap(): Promise<Record<string, string>> {
  await seedPromptConfigIfEmpty();

  if (!(await isTableAvailable("PromptConfig"))) {
    return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
  }

  try {
    const rows = await prisma.promptConfig.findMany({ orderBy: { key: "asc" } });
    if (!rows.length) {
      return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
    }

    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, value]) => [key, value.value]));
    }
    throw error;
  }
}

export async function listPromptConfigs(): Promise<Array<{ key: string; value: string; description: string | null }>> {
  await seedPromptConfigIfEmpty();

  if (!(await isTableAvailable("PromptConfig"))) {
    return Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, item]) => ({
      key,
      value: item.value,
      description: item.description,
    }));
  }

  try {
    return await prisma.promptConfig.findMany({ orderBy: { key: "asc" } });
  } catch (error) {
    if (isPrismaUnavailableError(error)) return [];
    throw error;
  }
}

export async function upsertPromptConfig(key: string, value: string, description?: string | null) {
  if (!(await isTableAvailable("PromptConfig"))) {
    throw new Error("PromptConfig table not available. Run prisma migration/db push.");
  }

  return prisma.promptConfig.upsert({
    where: { key },
    create: { key, value, description: description || null },
    update: { value, description: description || null },
  });
}

export async function listModuleConfigs(): Promise<ModuleConfigRecord[]> {
  if (!(await isTableAvailable("ModuleConfig"))) return [];

  try {
    return await prisma.moduleConfig.findMany({ orderBy: { id: "asc" } });
  } catch (error) {
    if (isPrismaUnavailableError(error)) return [];
    throw error;
  }
}

export async function getModuleConfigMap(): Promise<Record<string, ModuleConfigRecord>> {
  const list = await listModuleConfigs();
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export async function upsertModuleConfig(
  featureId: string,
  input: {
    name?: string;
    description?: string;
    availability?: "live" | "coming_soon";
    minimumPlan?: PlanId;
    isVisible?: boolean;
    promptHint?: string;
    inputHelp?: unknown;
    examples?: unknown;
  },
): Promise<ModuleConfigRecord> {
  if (!(await isTableAvailable("ModuleConfig"))) {
    throw new Error("ModuleConfig table not available. Run prisma migration/db push.");
  }

  return prisma.moduleConfig.upsert({
    where: { id: featureId },
    create: {
      id: featureId,
      name: input.name || null,
      description: input.description || null,
      availability: input.availability || null,
      minimumPlan: input.minimumPlan,
      isVisible: input.isVisible ?? true,
      promptHint: input.promptHint || null,
      inputHelp: input.inputHelp as any,
      examples: input.examples as any,
    },
    update: {
      name: input.name ?? null,
      description: input.description ?? null,
      availability: input.availability ?? null,
      minimumPlan: input.minimumPlan,
      isVisible: input.isVisible ?? true,
      promptHint: input.promptHint ?? null,
      inputHelp: input.inputHelp as any,
      examples: input.examples as any,
    },
  });
}

export function getDefaultPromptConfigMap() {
  return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, item]) => [key, item.value]));
}

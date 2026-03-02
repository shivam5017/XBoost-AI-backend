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
  {
    slug: "myth_reframe",
    label: "Myth Reframe",
    emoji: "🧭",
    instruction: "State a common belief, reframe it, and close with practical direction.",
    structure: "Myth: Post more to grow faster.\\nReality: Post clearer to convert faster.\\nDirection: One sharp POV beats five generic posts.",
    example: "Myth: More output = more growth.\\nReality: Better positioning = better conversion.\\nDirection: Publish fewer, sharper opinions.",
    category: "framework",
    target: "both",
    sortOrder: 140,
  },
  {
    slug: "operator_checklist",
    label: "Operator Checklist",
    emoji: "✅",
    instruction: "Give a short checklist creators can run before publishing.",
    structure: "Pre-publish checklist:\\n- Strong first line\\n- One clear point\\n- One proof line\\n- One CTA\\nShip.",
    example: "Pre-publish checklist:\\n- Hook in line one\\n- Single core argument\\n- Concrete proof\\n- Clear CTA\\nThen publish.",
    category: "list",
    target: "both",
    sortOrder: 150,
  },
  {
    slug: "before_after_bridge",
    label: "Before / After Bridge",
    emoji: "🌉",
    instruction: "Contrast old state and new state, then explain the bridge.",
    structure: "Before: Random posting, random outcomes.\\nAfter: Positioning-first system, compounding outcomes.\\nBridge: One repeatable weekly content loop.",
    example: "Before: Random posting and weak conversion.\\nAfter: Consistent system and qualified inbound.\\nBridge: weekly hooks + proof + CTA loop.",
    category: "comparison",
    target: "both",
    sortOrder: 160,
  },
  {
    slug: "micro_story_lesson",
    label: "Micro Story + Lesson",
    emoji: "📌",
    instruction: "Tell a 2-3 line micro story then extract one actionable lesson.",
    structure: "I spent months writing longer posts for reach.\\nResults were flat.\\nI switched to clearer hooks and one idea per post.\\nLesson: clarity scales faster than length.",
    example: "I posted daily but got weak conversion.\\nI switched to one clear POV per post.\\nLeads increased in 2 weeks.\\nLesson: focus beats frequency.",
    category: "story",
    target: "both",
    sortOrder: 170,
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
  tone_catalog_json: {
    description: "JSON object for dynamic tones in compose flows. Example: {\"smart\":\"...\"}",
    value: JSON.stringify(
      {
        smart: "Be insightful, add a unique perspective, and provide value. Sound knowledgeable but approachable.",
        viral: "Make it shareable and punchy. Use a strong hook. Create curiosity or spark emotion. Think retweet-worthy.",
        funny: "Be witty and clever. Use wordplay or unexpected angles. Keep it light and entertaining.",
        controversial: "Take a bold, contrarian stance that invites debate. Be confident. Challenge assumptions.",
        founder: "Sound like a startup founder sharing hard-won lessons. Reference growth, product, execution, or failure.",
        storyteller: "Open with a compelling hook, build tension, and land a punchy conclusion. Make it feel personal.",
        educator: "Break down complex ideas simply. Use analogies. Teach something genuinely useful.",
        concise: "Write tight, high-signal lines with zero fluff. Every sentence must earn attention.",
        authority: "Sound credible and conviction-led. Use precise language and clear stances.",
        contrarian: "Challenge mainstream assumptions with a defensible argument and practical angle.",
      },
      null,
      2,
    ),
  },
};

const tableAvailability: Record<string, boolean | undefined> = {
  PromptTemplate: undefined,
  PromptConfig: undefined,
  ModuleConfig: undefined,
  RoadmapItem: undefined,
};

function normalizeMultiline(value?: string | null): string | null {
  if (value == null) return null;
  return value.replace(/\\n/g, "\n");
}

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

async function isTableAvailable(table: "PromptTemplate" | "PromptConfig" | "ModuleConfig" | "RoadmapItem") {
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

const DEFAULT_ROADMAP: Array<{
  key: string;
  name: string;
  description: string;
  eta?: string;
  status: "upcoming" | "active";
  isActive: boolean;
  sortOrder: number;
}> = [
  {
    key: "team_workspaces",
    name: "Team Workspaces",
    description: "Shared brand voice, team prompts, and role-based access for multi-creator teams.",
    eta: "Q2 2026",
    status: "upcoming",
    isActive: true,
    sortOrder: 10,
  },
  {
    key: "auto_ab_variants",
    name: "Auto A/B Variants",
    description: "Generate multiple post variants with hook scoring before publishing.",
    eta: "Q2 2026",
    status: "upcoming",
    isActive: true,
    sortOrder: 20,
  },
  {
    key: "competitor_pulse",
    name: "Competitor Pulse",
    description: "Track niche leaders and uncover weekly content gaps you can exploit.",
    eta: "Q3 2026",
    status: "upcoming",
    isActive: true,
    sortOrder: 30,
  },
];

const DEFAULT_MODULE_CONFIGS: Array<{
  id: string;
  name: string;
  description: string;
  availability: "live" | "coming_soon";
  minimumPlan: PlanId;
  isVisible: boolean;
  sortOrder: number;
  promptHint?: string;
}> = [
  {
    id: "viralScorePredictor",
    name: "Viral Score Predictor",
    description: "Score post virality probability with factor-level breakdown before publishing.",
    availability: "live",
    minimumPlan: PlanId.starter,
    isVisible: true,
    sortOrder: 10,
    promptHint: "Paste a draft and niche context to get a score breakdown and improvement opportunities.",
  },
  {
    id: "bestTimeToPost",
    name: "Best Time to Post",
    description: "Recommend top posting windows using behavior and performance patterns.",
    availability: "live",
    minimumPlan: PlanId.starter,
    isVisible: true,
    sortOrder: 20,
  },
  {
    id: "contentPerformancePrediction",
    name: "Content Performance Prediction",
    description: "Forecast engagement range and recommend edits to improve expected outcomes.",
    availability: "live",
    minimumPlan: PlanId.starter,
    isVisible: true,
    sortOrder: 30,
  },
  {
    id: "viralHookIntelligence",
    name: "Viral Hook Intelligence Engine",
    description: "Analyze top niche hooks, score hook quality, and generate A/B hook variants.",
    availability: "live",
    minimumPlan: PlanId.starter,
    isVisible: true,
    sortOrder: 40,
  },
  {
    id: "preLaunchOptimizer",
    name: "Pre-Launch Optimizer",
    description: "Predict engagement range, optimize CTA, and suggest best posting windows before publishing.",
    availability: "live",
    minimumPlan: PlanId.starter,
    isVisible: true,
    sortOrder: 50,
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    description: "Growth trend graph, hook-type performance, and engagement efficiency metrics on web.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 60,
  },
  {
    id: "nicheTrendRadar",
    name: "Niche Trend Radar",
    description: "Track X niche momentum and surface early trend opportunities.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 70,
  },
  {
    id: "growthStrategist",
    name: "AI Growth Strategist Mode",
    description: "30-day roadmap, content pillars, hook bank, and competitor-based strategy guidance.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 80,
  },
  {
    id: "brandAnalyzer",
    name: "AI Personal Brand Analyzer",
    description: "Brand voice audit, positioning score, bio rewrite, and monetization direction.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 90,
  },
  {
    id: "threadWriterPro",
    name: "AI Thread Writer Pro+",
    description: "Story arc, contrarian angle prompts, CTA layering, and monetization insertion.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 100,
  },
  {
    id: "leadMagnetGenerator",
    name: "Auto Lead Magnet Generator",
    description: "Convert content into PDFs, checklists, Notion assets, and mini-course outlines.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 110,
  },
  {
    id: "audiencePsychology",
    name: "Audience Psychology Insights",
    description: "Identify emotional and authority triggers that drive follows, saves, and replies.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 120,
  },
  {
    id: "repurposingEngine",
    name: "AI Content Repurposing Engine",
    description: "Repurpose X threads into LinkedIn posts, carousels, newsletters, and short-video scripts.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 130,
  },
  {
    id: "monetizationToolkit",
    name: "Creator Monetization Toolkit",
    description: "Offer ideas, pricing strategy, sales threads, and launch calendar planning.",
    availability: "live",
    minimumPlan: PlanId.pro,
    isVisible: true,
    sortOrder: 140,
  },
];

async function seedRoadmapIfEmpty() {
  if (!(await isTableAvailable("RoadmapItem"))) return;

  try {
    const count = await prisma.roadmapItem.count();
    if (count > 0) return;

    await prisma.roadmapItem.createMany({
      data: DEFAULT_ROADMAP,
      skipDuplicates: true,
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) return;
    throw error;
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
        instruction: normalizeMultiline(tpl.instruction) || "",
        structure: normalizeMultiline(tpl.structure || null),
        example: normalizeMultiline(tpl.example || null),
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

async function seedModuleConfigIfEmpty() {
  if (!(await isTableAvailable("ModuleConfig"))) return;

  try {
    const count = await prisma.moduleConfig.count();
    if (count > 0) return;

    await prisma.moduleConfig.createMany({
      data: DEFAULT_MODULE_CONFIGS.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        availability: row.availability,
        minimumPlan: row.minimumPlan,
        isVisible: row.isVisible,
        promptHint: row.promptHint || null,
        inputHelp: undefined,
        examples: undefined,
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
        .map((t) => [
          t.slug,
          {
            label: t.label,
            emoji: t.emoji || "🧩",
            instruction: [
              normalizeMultiline(t.instruction) || "",
              normalizeMultiline(t.structure || null) ? `Format style:\n${normalizeMultiline(t.structure || null)}` : "",
              normalizeMultiline(t.example || null) ? `Reference example:\n${normalizeMultiline(t.example || null)}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ]),
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
        structure: true,
        example: true,
      },
    });

    return Object.fromEntries(
      rows.map((row) => [
        row.slug,
        {
          label: row.label,
          emoji: row.emoji,
          instruction: [
            normalizeMultiline(row.instruction) || "",
            normalizeMultiline(row.structure || null) ? `Format style:\n${normalizeMultiline(row.structure || null)}` : "",
            normalizeMultiline(row.example || null) ? `Reference example:\n${normalizeMultiline(row.example || null)}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ]),
    );
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return Object.fromEntries(
        DEFAULT_TEMPLATES
          .filter((t) => t.isActive !== false)
          .filter((t) => target === "all" || t.target === "both" || t.target === target)
          .map((t) => [
            t.slug,
            {
              label: t.label,
              emoji: t.emoji || "🧩",
              instruction: [
                normalizeMultiline(t.instruction) || "",
                normalizeMultiline(t.structure || null) ? `Format style:\n${normalizeMultiline(t.structure || null)}` : "",
                normalizeMultiline(t.example || null) ? `Reference example:\n${normalizeMultiline(t.example || null)}` : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ]),
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
      instruction: normalizeMultiline(tpl.instruction) || "",
      structure: normalizeMultiline(tpl.structure || null),
      example: normalizeMultiline(tpl.example || null),
      category: tpl.category || "general",
      target: tpl.target || "both",
      isActive: tpl.isActive ?? true,
      sortOrder: tpl.sortOrder ?? 0,
    }));
  }

  try {
    const rows = await prisma.promptTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return rows.map((row) => ({
      ...row,
      instruction: normalizeMultiline(row.instruction) || "",
      structure: normalizeMultiline(row.structure),
      example: normalizeMultiline(row.example),
    }));
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
      instruction: normalizeMultiline(input.instruction) || "",
      structure: normalizeMultiline(input.structure || null),
      example: normalizeMultiline(input.example || null),
      category: input.category || "general",
      target: input.target || "both",
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      label: input.label,
      emoji: input.emoji || "🧩",
      instruction: normalizeMultiline(input.instruction) || "",
      structure: normalizeMultiline(input.structure || null),
      example: normalizeMultiline(input.example || null),
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
  await seedModuleConfigIfEmpty();
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

export async function listRoadmapItems(includeInactive = false) {
  await seedRoadmapIfEmpty();

  if (!(await isTableAvailable("RoadmapItem"))) {
    return includeInactive ? DEFAULT_ROADMAP : DEFAULT_ROADMAP.filter((item) => item.isActive);
  }

  try {
    return await prisma.roadmapItem.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return includeInactive ? DEFAULT_ROADMAP : DEFAULT_ROADMAP.filter((item) => item.isActive);
    }
    throw error;
  }
}

export async function upsertRoadmapItem(input: {
  key: string;
  name: string;
  description: string;
  eta?: string;
  status?: "upcoming" | "active";
  isActive?: boolean;
  sortOrder?: number;
}) {
  if (!(await isTableAvailable("RoadmapItem"))) {
    throw new Error("RoadmapItem table not available. Run prisma migration/db push.");
  }

  return prisma.roadmapItem.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      description: input.description,
      eta: input.eta || null,
      status: input.status || "upcoming",
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      name: input.name,
      description: input.description,
      eta: input.eta || null,
      status: input.status || "upcoming",
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function deleteRoadmapItem(key: string) {
  if (!(await isTableAvailable("RoadmapItem"))) {
    throw new Error("RoadmapItem table not available. Run prisma migration/db push.");
  }
  await prisma.roadmapItem.delete({ where: { key } });
}

export function getDefaultPromptConfigMap() {
  return Object.fromEntries(Object.entries(DEFAULT_PROMPT_CONFIG).map(([key, item]) => [key, item.value]));
}

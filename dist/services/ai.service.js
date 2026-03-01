"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToneCatalog = getToneCatalog;
exports.generateReply = generateReply;
exports.analyzeTweet = analyzeTweet;
exports.createTweet = createTweet;
exports.rewriteTweet = rewriteTweet;
exports.getActiveTemplates = getActiveTemplates;
exports.viralHookIntelligence = viralHookIntelligence;
exports.preLaunchOptimizer = preLaunchOptimizer;
exports.nicheTrendRadar = nicheTrendRadar;
exports.growthStrategistMode = growthStrategistMode;
exports.personalBrandAnalyzer = personalBrandAnalyzer;
exports.threadWriterPro = threadWriterPro;
exports.leadMagnetGenerator = leadMagnetGenerator;
exports.audiencePsychologyInsights = audiencePsychologyInsights;
exports.repurposingEngine = repurposingEngine;
exports.monetizationToolkit = monetizationToolkit;
exports.viralScorePredictor = viralScorePredictor;
exports.bestTimeToPost = bestTimeToPost;
exports.contentPerformancePrediction = contentPerformancePrediction;
const openai_1 = __importDefault(require("openai"));
const catalog_service_1 = require("./catalog.service");
const DEFAULT_TONE_PROMPTS = {
    smart: 'Be insightful, add a unique perspective, and provide value. Sound knowledgeable but approachable.',
    viral: 'Make it shareable and punchy. Use a strong hook. Create curiosity or spark emotion. Think retweet-worthy.',
    funny: 'Be witty and clever. Use wordplay or unexpected angles. Keep it light and entertaining.',
    controversial: 'Take a bold, contrarian stance that invites debate. Be confident. Challenge assumptions.',
    founder: 'Sound like a startup founder sharing hard-won lessons. Reference growth, product, execution, or failure.',
    storyteller: 'Open with a compelling hook, build tension, and land a punchy conclusion. Make it feel personal.',
    educator: 'Break down complex ideas simply. Use analogies. Teach something genuinely useful.',
};
// ── Helper ────────────────────────────────────────────────────────────────────
function getClient(userApiKey) {
    const key = userApiKey || process.env.OPENAI_API_KEY;
    if (!key)
        throw new Error('No OpenAI API key available. Please add your API key in Settings.');
    return new openai_1.default({ apiKey: key });
}
function wordCountToTokens(wordCount) {
    // ~1.3 tokens per word, add buffer for formatting
    return Math.ceil(wordCount * 1.5) + 20;
}
function buildLengthInstruction(wordCount) {
    if (wordCount <= 30)
        return `Keep it very short — around ${wordCount} words maximum. Be punchy.`;
    if (wordCount <= 60)
        return `Aim for roughly ${wordCount} words. Concise but complete.`;
    if (wordCount <= 120)
        return `Write around ${wordCount} words. Enough room to develop the idea.`;
    return `Write around ${wordCount} words. You have space — use it to add depth and value.`;
}
const SYSTEM_GUARDRAILS = `
Quality bar:
- Write like a real person on X, not a marketing template.
- Prefer concrete language over generic motivation.
- Use short sentence rhythm and clean line breaks.
- Avoid clickbait cliches, filler, and emoji spam.
- Avoid these openers unless context truly requires them:
  "Great point", "I agree", "This!", "Absolutely", "Couldn't agree more".
- Keep it safe for work and policy-compliant.
- Prioritize novelty and angle diversity. Avoid repeating common phrasing.
`;
async function resolveGenerationConfig() {
    const defaults = (0, catalog_service_1.getDefaultPromptConfigMap)();
    try {
        return await (0, catalog_service_1.getPromptConfigMap)();
    }
    catch {
        return defaults;
    }
}
async function getToneCatalog() {
    const fallback = DEFAULT_TONE_PROMPTS;
    const config = await resolveGenerationConfig();
    const raw = config.tone_catalog_json;
    if (!raw)
        return fallback;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return fallback;
        const safe = Object.fromEntries(Object.entries(parsed)
            .filter(([k, v]) => typeof k === "string" && typeof v === "string" && k.trim() && v.trim())
            .map(([k, v]) => [k.trim(), v.trim()]));
        return Object.keys(safe).length ? safe : fallback;
    }
    catch {
        return fallback;
    }
}
async function resolveTemplateInstruction(templateId, target) {
    if (!templateId)
        return "";
    const map = await (0, catalog_service_1.getActiveTemplateMap)(target);
    const match = map[templateId];
    if (!match)
        return "";
    return `\nTemplate: ${match.instruction}`;
}
function buildGenerationPrompt(objective, toneInstruction, lengthInstruction, templateInstruction, customPrompt) {
    return `${objective}

Tone: ${toneInstruction}
Length: ${lengthInstruction}${templateInstruction}${customPrompt}

${SYSTEM_GUARDRAILS}

Output constraints:
- Return only final text.
- No markdown fences.
- No meta commentary.`;
}
// ── generateReply — responds to a specific tweet ──────────────────────────────
async function generateReply(tweetText, tone, userApiKey, wordCount = 50, templateId, userPrompt) {
    const openai = getClient(userApiKey);
    const toneMap = await getToneCatalog();
    const toneInstruction = toneMap[tone] || toneMap.smart || DEFAULT_TONE_PROMPTS.smart;
    const lengthInstruction = buildLengthInstruction(wordCount);
    const templateInstruction = await resolveTemplateInstruction(templateId, "reply");
    const customPrompt = userPrompt?.trim()
        ? `\nUser preference: ${userPrompt.trim()}`
        : "";
    const config = await resolveGenerationConfig();
    const guardrails = config.generation_guardrails || SYSTEM_GUARDRAILS;
    const objective = config.reply_objective ||
        `You are an elite X growth strategist. Generate ONE reply that directly addresses the source tweet and adds a fresh angle, useful insight, or respectful disagreement.`;
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: wordCountToTokens(wordCount),
        temperature: 0.92,
        frequency_penalty: 0.35,
        presence_penalty: 0.45,
        messages: [
            {
                role: 'system',
                content: buildGenerationPrompt(`${objective}

Context rules:
- Must reference the specific tweet context, not a generic reply.
- Under 280 characters unless template is thread hook.
- No hashtags unless essential.`, toneInstruction, lengthInstruction, templateInstruction, customPrompt).replace(SYSTEM_GUARDRAILS, guardrails),
            },
            {
                role: 'user',
                content: `Tweet to reply to:\n"${tweetText}"\n\nGenerate a ${tone} reply:`,
            },
        ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() || '';
    const tokens = completion.usage?.total_tokens || 0;
    return { reply, tokens };
}
// ── analyzeTweet ──────────────────────────────────────────────────────────────
async function analyzeTweet(tweetText, userApiKey) {
    const openai = getClient(userApiKey);
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `Analyze this tweet and return JSON:
{
  "tone": string,
  "engagementScore": number (0-100),
  "viralPotential": "Low" | "Medium" | "High",
  "hooks": string[],
  "suggestions": string[],
  "sentiment": "positive" | "neutral" | "negative",
  "bestReplyAngle": string,
  "estimatedReadTime": string
}`,
            },
            { role: 'user', content: tweetText },
        ],
    });
    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return { analysis, tokens: completion.usage?.total_tokens || 0 };
}
// ── createTweet — original tweet on a topic ───────────────────────────────────
async function createTweet(topic, tone, userApiKey, wordCount = 50, templateId, userPrompt) {
    const openai = getClient(userApiKey);
    const toneMap = await getToneCatalog();
    const toneInstruction = toneMap[tone] || toneMap.smart || DEFAULT_TONE_PROMPTS.smart;
    const lengthInstruction = buildLengthInstruction(wordCount);
    const templateInstruction = await resolveTemplateInstruction(templateId, "tweet");
    const customPrompt = userPrompt?.trim()
        ? `\nUser preference: ${userPrompt.trim()}`
        : "";
    const config = await resolveGenerationConfig();
    const guardrails = config.generation_guardrails || SYSTEM_GUARDRAILS;
    const objective = config.create_objective || "Create one high-performing original tweet.";
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: wordCountToTokens(wordCount),
        temperature: 0.95,
        frequency_penalty: 0.4,
        presence_penalty: 0.5,
        messages: [
            {
                role: 'system',
                content: buildGenerationPrompt(`${objective}

Content rules:
- Start with a hook that earns attention in first 8-12 words.
- Deliver one core insight, opinion, or practical takeaway.
- No hashtag spam (max 1 if relevant).
- Under 280 characters unless template is thread hook.`, toneInstruction, lengthInstruction, templateInstruction, customPrompt).replace(SYSTEM_GUARDRAILS, guardrails),
            },
            { role: 'user', content: `Topic: ${topic}` },
        ],
    });
    const tweet = completion.choices[0]?.message?.content?.trim() || '';
    return { tweet, tokens: completion.usage?.total_tokens || 0 };
}
// ── rewriteTweet ──────────────────────────────────────────────────────────────
async function rewriteTweet(draftText, tone, userApiKey, wordCount = 50, templateId, userPrompt) {
    const openai = getClient(userApiKey);
    const toneMap = await getToneCatalog();
    const toneInstruction = toneMap[tone] || toneMap.smart || DEFAULT_TONE_PROMPTS.smart;
    const lengthInstruction = buildLengthInstruction(wordCount);
    const templateInstruction = await resolveTemplateInstruction(templateId, "tweet");
    const customPrompt = userPrompt?.trim()
        ? `\nUser preference: ${userPrompt.trim()}`
        : "";
    const config = await resolveGenerationConfig();
    const guardrails = config.generation_guardrails || SYSTEM_GUARDRAILS;
    const objective = config.rewrite_objective ||
        "Rewrite the draft to be materially stronger while preserving original meaning.";
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: wordCountToTokens(wordCount),
        temperature: 0.88,
        frequency_penalty: 0.28,
        presence_penalty: 0.34,
        messages: [
            {
                role: 'system',
                content: buildGenerationPrompt(`${objective}

Rewrite rules:
- Keep the same intent, sharpen the framing.
- Improve hook clarity and pacing.
- Remove filler and weak qualifiers.
- Under 280 characters unless template is thread hook.`, toneInstruction, lengthInstruction, templateInstruction, customPrompt).replace(SYSTEM_GUARDRAILS, guardrails),
            },
            { role: 'user', content: `Draft: "${draftText}"` },
        ],
    });
    const rewrite = completion.choices[0]?.message?.content?.trim() || '';
    return { rewrite, tokens: completion.usage?.total_tokens || 0 };
}
async function getActiveTemplates(target = "all") {
    return (0, catalog_service_1.getActiveTemplateMap)(target);
}
function clampScore(value) {
    return Math.max(1, Math.min(100, Math.round(value)));
}
function extractKeywords(text, limit = 8) {
    const stop = new Set([
        "the", "and", "for", "that", "with", "this", "from", "your", "into", "about",
        "have", "will", "just", "you", "are", "was", "were", "they", "them", "then",
        "what", "when", "where", "which", "while", "there", "their", "than", "been",
        "into", "over", "under", "more", "less", "very", "also", "not", "why", "how",
    ]);
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stop.has(word));
    const freq = new Map();
    for (const token of tokens)
        freq.set(token, (freq.get(token) || 0) + 1);
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word]) => word);
}
async function jsonModuleCall(systemPrompt, userPrompt, fallback, userApiKey) {
    if (!userApiKey && !process.env.OPENAI_API_KEY) {
        return { data: fallback, tokens: 0 };
    }
    try {
        const openai = getClient(userApiKey);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 800,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        return {
            data: JSON.parse(raw),
            tokens: completion.usage?.total_tokens || 0,
        };
    }
    catch {
        return { data: fallback, tokens: 0 };
    }
}
async function viralHookIntelligence(niche, samplePosts, userApiKey) {
    const corpus = samplePosts.join(" ");
    const keywords = extractKeywords(`${niche} ${corpus}`, 10);
    const baseScore = clampScore(55 + Math.min(samplePosts.length * 4, 20) + Math.min(keywords.length, 10));
    const fallback = {
        hookScore: baseScore,
        patterns: [
            "Contrarian opener",
            "Specific-number claim",
            "Outcome-first promise",
        ],
        optimizedHooks: [
            `Unpopular ${niche} truth: consistency beats hacks every time.`,
            `${niche} creators ignore this one lever and lose compounding growth.`,
            `I tested 30 days of ${niche} content. Here is what actually moved reach.`,
        ],
        abVariants: [
            { a: `Most ${niche} advice is wrong.`, b: `Most ${niche} creators are optimizing the wrong metric.` },
            { a: `Here is the system I used to grow in ${niche}.`, b: `I replaced random posting with this ${niche} growth loop.` },
        ],
        topKeywords: keywords,
    };
    const prompt = `Niche: ${niche}
Sample posts:
${samplePosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    return jsonModuleCall(`Return JSON:
{
  "hookScore": number,
  "patterns": string[],
  "optimizedHooks": string[],
  "abVariants": [{"a": string, "b": string}],
  "topKeywords": string[]
}
Give high-signal actionable output.`, prompt, fallback, userApiKey).then((r) => ({
        analysis: { ...fallback, ...r.data, hookScore: clampScore(Number(r.data?.hookScore ?? fallback.hookScore)) },
        tokens: r.tokens,
    }));
}
async function preLaunchOptimizer(draft, niche, historicalBestHours, userApiKey) {
    const hookWords = extractKeywords(draft, 5);
    const score = clampScore(50 + Math.min(draft.length / 6, 30) + hookWords.length * 3);
    const bestTimes = (historicalBestHours.length ? historicalBestHours : [9, 13, 18]).map((h) => `${h}:00`);
    const fallback = {
        viralPotential: score,
        engagementRange: "2.1% - 4.8%",
        bestTimes,
        ctaSuggestions: [
            "End with a pointed question to trigger replies.",
            "Ask for a specific opinion instead of generic feedback.",
        ],
        improvedDraft: draft,
        weaknesses: [
            "Hook can be sharper in first 8 words.",
            "Add one concrete result or data point.",
        ],
    };
    const prompt = `Niche: ${niche}
Draft:
${draft}

Best posting windows (local user time): ${bestTimes.join(", ")}`;
    return jsonModuleCall(`Return JSON:
{
  "viralPotential": number,
  "engagementRange": string,
  "bestTimes": string[],
  "ctaSuggestions": string[],
  "improvedDraft": string,
  "weaknesses": string[]
}
Be concise and tactical.`, prompt, fallback, userApiKey).then((r) => ({
        analysis: {
            ...fallback,
            ...r.data,
            viralPotential: clampScore(Number(r.data?.viralPotential ?? fallback.viralPotential)),
        },
        tokens: r.tokens,
    }));
}
async function nicheTrendRadar(niche, userApiKey) {
    const keywords = extractKeywords(niche, 6);
    const fallback = {
        trendSignals: [
            { topic: `${niche} workflows`, momentum: 78, opportunity: "High" },
            { topic: `${niche} automation`, momentum: 72, opportunity: "Medium" },
            { topic: `${niche} monetization`, momentum: 69, opportunity: "High" },
        ],
        watchlist: keywords,
        recommendations: [
            "Publish a contrarian take within 2 hours for maximum freshness.",
            "Quote-post niche leaders with an opinionated framework.",
        ],
    };
    return jsonModuleCall(`Return JSON:
{
  "trendSignals": [{"topic": string, "momentum": number, "opportunity": "Low"|"Medium"|"High"}],
  "watchlist": string[],
  "recommendations": string[]
}`, `Niche: ${niche}`, fallback, userApiKey).then((r) => ({
        analysis: {
            ...fallback,
            ...r.data,
            trendSignals: (r.data?.trendSignals || fallback.trendSignals).map((t) => ({
                topic: String(t.topic || ""),
                momentum: clampScore(Number(t.momentum || 60)),
                opportunity: ["Low", "Medium", "High"].includes(t.opportunity) ? t.opportunity : "Medium",
            })),
        },
        tokens: r.tokens,
    }));
}
async function growthStrategistMode(niche, goals, userApiKey) {
    const fallback = {
        roadmap30Days: [
            "Week 1: clarify positioning + hooks baseline",
            "Week 2: high-frequency commentary loop",
            "Week 3: authority thread + lead magnet cycle",
            "Week 4: conversion-focused content sprint",
        ],
        contentPillars: ["Insights", "Case studies", "Contrarian opinions"],
        competitorBreakdown: [
            "Top creators win by posting specific outcomes, not generic tips.",
            "Short hooks + one concrete proof point performs best.",
        ],
        viralPatterns: ["Curiosity gap + specificity", "Strong opinion + audience callout"],
        weeklyHookBank: [
            `${niche} creators miss this compounding loop.`,
            `I stopped doing this in ${niche} and growth accelerated.`,
        ],
    };
    return jsonModuleCall(`Return JSON:
{
  "roadmap30Days": string[],
  "contentPillars": string[],
  "competitorBreakdown": string[],
  "viralPatterns": string[],
  "weeklyHookBank": string[]
}`, `Niche: ${niche}
Primary goals: ${goals}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function personalBrandAnalyzer(profile, tweets, userApiKey) {
    const fallback = {
        voiceSummary: "Educational with occasional contrarian hooks; tighten positioning language.",
        strengths: ["Clear intent", "Consistent niche topics"],
        weaknesses: ["Low specificity", "CTA inconsistency"],
        positioningScore: 68,
        bioRewrite: "Helping creators grow audience and revenue with AI-first content systems.",
        monetizationSuggestions: ["Productized audits", "Template bundle", "Live workshop cohort"],
    };
    return jsonModuleCall(`Return JSON:
{
  "voiceSummary": string,
  "strengths": string[],
  "weaknesses": string[],
  "positioningScore": number,
  "bioRewrite": string,
  "monetizationSuggestions": string[]
}`, `Profile:
${profile}

Recent tweets:
${tweets.map((t, i) => `${i + 1}. ${t}`).join("\n")}`, fallback, userApiKey).then((r) => ({
        analysis: {
            ...fallback,
            ...r.data,
            positioningScore: clampScore(Number(r.data?.positioningScore ?? fallback.positioningScore)),
        },
        tokens: r.tokens,
    }));
}
async function threadWriterPro(topic, objective, userApiKey) {
    const fallback = {
        title: `${topic}: Practical thread`,
        sections: [
            "Hook",
            "Context",
            "Framework",
            "Proof",
            "CTA",
        ],
        thread: [
            `1/ ${topic} sounds hard until you see the pattern.`,
            `2/ Most people fail because they chase volume without a system.`,
            `3/ Use this framework: signal -> structure -> story -> CTA.`,
            `4/ Apply it for 14 days and track reply depth, not vanity metrics.`,
            `5/ Want the template? Reply with "thread".`,
        ],
    };
    return jsonModuleCall(`Return JSON:
{
  "title": string,
  "sections": string[],
  "thread": string[]
}
Output a practical high-retention thread.`, `Topic: ${topic}
Objective: ${objective}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function leadMagnetGenerator(content, audience, userApiKey) {
    const fallback = {
        pdfOutline: ["Problem framing", "3-step system", "Checklist", "Next action"],
        notionTemplateSections: ["Dashboard", "Weekly goals", "Content tracker", "Hook bank"],
        checklist: ["Define niche", "Pick offer", "Ship 5 posts", "Measure conversion"],
        miniCourseOutline: ["Module 1: Foundations", "Module 2: Content engine", "Module 3: Monetization"],
    };
    return jsonModuleCall(`Return JSON:
{
  "pdfOutline": string[],
  "notionTemplateSections": string[],
  "checklist": string[],
  "miniCourseOutline": string[]
}`, `Source content:
${content}

Target audience: ${audience}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function audiencePsychologyInsights(niche, audience, userApiKey) {
    const fallback = {
        engagementTriggers: ["Specific transformation claims", "Clear before/after contrast"],
        saveTriggers: ["Framework lists", "Repeatable checklists"],
        followTriggers: ["Unique POV + consistent series"],
        emotionalHooks: ["Fear of stagnation", "Momentum and identity gain"],
        authorityAngles: ["Proof-backed hot takes", "Operator lessons"],
    };
    return jsonModuleCall(`Return JSON:
{
  "engagementTriggers": string[],
  "saveTriggers": string[],
  "followTriggers": string[],
  "emotionalHooks": string[],
  "authorityAngles": string[]
}`, `Niche: ${niche}
Audience: ${audience}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function repurposingEngine(source, userApiKey) {
    const fallback = {
        linkedinPost: source,
        newsletterDraft: `Subject: ${source.slice(0, 50)}\n\n${source}`,
        carouselScript: ["Slide 1: Hook", "Slide 2: Problem", "Slide 3: Framework", "Slide 4: CTA"],
        reelScript: "Hook in first 3 seconds, one core lesson, end with CTA.",
    };
    return jsonModuleCall(`Return JSON:
{
  "linkedinPost": string,
  "newsletterDraft": string,
  "carouselScript": string[],
  "reelScript": string
}`, `Repurpose this source content:
${source}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function monetizationToolkit(niche, audience, userApiKey) {
    const fallback = {
        productIdeas: ["Template pack", "Audit service", "Mini cohort"],
        pricingStrategy: ["Entry: $29", "Core: $149", "Premium: $499"],
        offerPositioning: "Outcome-first positioning with clear timeframe and proof.",
        salesThreadOutline: ["Hook", "Pain", "Method", "Proof", "Offer", "CTA"],
        launchCalendar: ["Day 1 teaser", "Day 3 value post", "Day 5 proof", "Day 7 offer"],
    };
    return jsonModuleCall(`Return JSON:
{
  "productIdeas": string[],
  "pricingStrategy": string[],
  "offerPositioning": string,
  "salesThreadOutline": string[],
  "launchCalendar": string[]
}`, `Niche: ${niche}
Audience: ${audience}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function viralScorePredictor(draft, niche, userApiKey) {
    const hookStrength = Math.min(25, Math.round(draft.slice(0, 80).split(" ").length * 1.8));
    const specificity = Math.min(25, extractKeywords(draft, 8).length * 3);
    const structure = Math.min(20, draft.includes("?") || draft.includes(":") ? 16 : 10);
    const cta = Math.min(15, /\b(reply|comment|follow|share|save|retweet)\b/i.test(draft) ? 14 : 8);
    const relevance = Math.min(15, extractKeywords(`${niche} ${draft}`, 6).length * 2);
    const score = clampScore(hookStrength + specificity + structure + cta + relevance);
    const fallback = {
        score,
        factors: {
            hookStrength,
            specificity,
            structure,
            cta,
            relevance,
        },
        verdict: score >= 75 ? "High" : score >= 55 ? "Medium" : "Low",
        suggestions: [
            "Tighten first line to maximize curiosity in first 8-12 words.",
            "Add one concrete metric or outcome to improve credibility.",
            "Close with a specific engagement prompt.",
        ],
    };
    return jsonModuleCall(`Return JSON:
{
  "score": number,
  "factors": {
    "hookStrength": number,
    "specificity": number,
    "structure": number,
    "cta": number,
    "relevance": number
  },
  "verdict": "Low" | "Medium" | "High",
  "suggestions": string[]
}`, `Niche: ${niche}
Draft:
${draft}`, fallback, userApiKey).then((r) => ({
        analysis: {
            ...fallback,
            ...r.data,
            score: clampScore(Number(r.data?.score ?? fallback.score)),
        },
        tokens: r.tokens,
    }));
}
async function bestTimeToPost(niche, historicalBestHours, userApiKey) {
    const topHours = (historicalBestHours.length ? historicalBestHours : [9, 13, 18]).slice(0, 5);
    const fallback = {
        topWindows: topHours.map((h) => `${h}:00`),
        timezoneNote: "Uses your local timezone from request header.",
        rationale: [
            "Peak usage windows from your recent activity patterns.",
            `Strong fit for ${niche} audience behavior cycles.`,
        ],
        postingPlan: [
            "Primary slot: highest historical conversion window.",
            "Secondary slot: backup testing window.",
            "Use first 10 minutes for engagement responses.",
        ],
    };
    return jsonModuleCall(`Return JSON:
{
  "topWindows": string[],
  "timezoneNote": string,
  "rationale": string[],
  "postingPlan": string[]
}`, `Niche: ${niche}
Historical top hours: ${topHours.join(", ")}`, fallback, userApiKey).then((r) => ({ analysis: { ...fallback, ...r.data }, tokens: r.tokens }));
}
async function contentPerformancePrediction(draft, niche, historicalBestHours, userApiKey) {
    const pre = await preLaunchOptimizer(draft, niche, historicalBestHours, userApiKey);
    const score = clampScore(Number(pre.analysis?.viralPotential ?? 60));
    return {
        analysis: {
            predictedRange: pre.analysis?.engagementRange || "1.8% - 4.2%",
            confidence: score >= 75 ? "High" : score >= 55 ? "Medium" : "Low",
            recommendedTimes: pre.analysis?.bestTimes || ["9:00", "13:00", "18:00"],
            editActions: pre.analysis?.weaknesses || [],
            optimizedDraft: pre.analysis?.improvedDraft || draft,
            predictedScore: score,
        },
        tokens: pre.tokens,
    };
}

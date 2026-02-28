import OpenAI from 'openai';

const TONE_PROMPTS: Record<string, string> = {
  smart:         'Be insightful, add a unique perspective, and provide value. Sound knowledgeable but approachable.',
  viral:         'Make it shareable and punchy. Use a strong hook. Create curiosity or spark emotion. Think retweet-worthy.',
  funny:         'Be witty and clever. Use wordplay or unexpected angles. Keep it light and entertaining.',
  controversial: 'Take a bold, contrarian stance that invites debate. Be confident. Challenge assumptions.',
  founder:       'Sound like a startup founder sharing hard-won lessons. Reference growth, product, execution, or failure.',
  storyteller:   'Open with a compelling hook, build tension, and land a punchy conclusion. Make it feel personal.',
  educator:      'Break down complex ideas simply. Use analogies. Teach something genuinely useful.',
};

// Templates are named prompts that add extra context to the output
export const TEMPLATES: Record<string, { label: string; emoji: string; instruction: string }> = {
  thread_hook:    { label: 'Thread Hook',    emoji: '🧵', instruction: 'Format as a compelling thread opener that makes people want to click "show more".' },
  hot_take:       { label: 'Hot Take',       emoji: '🔥', instruction: 'Frame as a bold hot take. Start with a provocative statement. Own it.' },
  personal_story: { label: 'Personal Story', emoji: '📖', instruction: 'Write in first person as a personal experience or lesson. Use "I" statements. Feel authentic.' },
  question:       { label: 'Engage Question',emoji: '❓', instruction: 'End with a thought-provoking question that drives replies. Make people want to answer.' },
  listicle:       { label: 'Quick List',     emoji: '📋', instruction: 'Format as a tight numbered list (max 4 items). Each point should be punchy and standalone.' },
  quote_style:    { label: 'Quote Style',    emoji: '💬', instruction: 'Write in a quotable, aphorism-style. Short, memorable, screenshot-worthy.' },
  data_insight:   { label: 'Data Insight',   emoji: '📊', instruction: 'Present as a surprising stat or data-backed insight. Use specific numbers even if illustrative.' },
  cta:            { label: 'Call to Action',  emoji: '🎯', instruction: 'End with a clear, specific call to action that drives engagement (follow, comment, share, try).' },
};

// ── Helper ────────────────────────────────────────────────────────────────────
function getClient(userApiKey?: string | null): OpenAI {
  const key = userApiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No OpenAI API key available. Please add your API key in Settings.');
  return new OpenAI({ apiKey: key });
}

function wordCountToTokens(wordCount: number): number {
  // ~1.3 tokens per word, add buffer for formatting
  return Math.ceil(wordCount * 1.5) + 20;
}

function buildLengthInstruction(wordCount: number): string {
  if (wordCount <= 30)  return `Keep it very short — around ${wordCount} words maximum. Be punchy.`;
  if (wordCount <= 60)  return `Aim for roughly ${wordCount} words. Concise but complete.`;
  if (wordCount <= 120) return `Write around ${wordCount} words. Enough room to develop the idea.`;
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
`;

function buildGenerationPrompt(
  objective: string,
  toneInstruction: string,
  lengthInstruction: string,
  templateInstruction: string,
): string {
  return `${objective}

Tone: ${toneInstruction}
Length: ${lengthInstruction}${templateInstruction}

${SYSTEM_GUARDRAILS}

Output constraints:
- Return only final text.
- No markdown fences.
- No meta commentary.`;
}

// ── generateReply — responds to a specific tweet ──────────────────────────────
export async function generateReply(
  tweetText: string,
  tone: string,
  userApiKey?: string | null,
  wordCount = 50,
  templateId?: string,
): Promise<{ reply: string; tokens: number }> {
  const openai = getClient(userApiKey);
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;
  const lengthInstruction = buildLengthInstruction(wordCount);
  const templateInstruction = templateId && TEMPLATES[templateId]
    ? `\nTemplate: ${TEMPLATES[templateId].instruction}`
    : '';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: wordCountToTokens(wordCount),
    messages: [
      {
        role: 'system',
        content: buildGenerationPrompt(
          `You are an elite X growth strategist. Generate ONE reply that directly addresses the source tweet and adds a fresh angle, useful insight, or respectful disagreement.

Context rules:
- Must reference the specific tweet context, not a generic reply.
- Under 280 characters unless template is thread hook.
- No hashtags unless essential.`,
          toneInstruction,
          lengthInstruction,
          templateInstruction,
        ),
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
export async function analyzeTweet(
  tweetText: string,
  userApiKey?: string | null,
): Promise<{ analysis: object; tokens: number }> {
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
export async function createTweet(
  topic: string,
  tone: string,
  userApiKey?: string | null,
  wordCount = 50,
  templateId?: string,
): Promise<{ tweet: string; tokens: number }> {
  const openai = getClient(userApiKey);
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;
  const lengthInstruction = buildLengthInstruction(wordCount);
  const templateInstruction = templateId && TEMPLATES[templateId]
    ? `\nTemplate: ${TEMPLATES[templateId].instruction}`
    : '';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: wordCountToTokens(wordCount),
    messages: [
      {
        role: 'system',
        content: buildGenerationPrompt(
          `Create one high-performing original tweet.

Content rules:
- Start with a hook that earns attention in first 8-12 words.
- Deliver one core insight, opinion, or practical takeaway.
- No hashtag spam (max 1 if relevant).
- Under 280 characters unless template is thread hook.`,
          toneInstruction,
          lengthInstruction,
          templateInstruction,
        ),
      },
      { role: 'user', content: `Topic: ${topic}` },
    ],
  });

  const tweet = completion.choices[0]?.message?.content?.trim() || '';
  return { tweet, tokens: completion.usage?.total_tokens || 0 };
}

// ── rewriteTweet ──────────────────────────────────────────────────────────────
export async function rewriteTweet(
  draftText: string,
  tone: string,
  userApiKey?: string | null,
  wordCount = 50,
  templateId?: string,
): Promise<{ rewrite: string; tokens: number }> {
  const openai = getClient(userApiKey);
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;
  const lengthInstruction = buildLengthInstruction(wordCount);
  const templateInstruction = templateId && TEMPLATES[templateId]
    ? `\nTemplate: ${TEMPLATES[templateId].instruction}`
    : '';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: wordCountToTokens(wordCount),
    messages: [
      {
        role: 'system',
        content: buildGenerationPrompt(
          `Rewrite the draft to be materially stronger while preserving original meaning.

Rewrite rules:
- Keep the same intent, sharpen the framing.
- Improve hook clarity and pacing.
- Remove filler and weak qualifiers.
- Under 280 characters unless template is thread hook.`,
          toneInstruction,
          lengthInstruction,
          templateInstruction,
        ),
      },
      { role: 'user', content: `Draft: "${draftText}"` },
    ],
  });

  const rewrite = completion.choices[0]?.message?.content?.trim() || '';
  return { rewrite, tokens: completion.usage?.total_tokens || 0 };
}

import OpenAI from 'openai';
import dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TONE_PROMPTS: Record<string, string> = {
  smart: 'Be insightful, add a unique perspective, and provide value. Sound knowledgeable.',
  viral: 'Make it shareable and punchy. Use a hook. Create curiosity. Spark emotion.',
  funny: 'Be witty and clever. Use wordplay or unexpected angles. Keep it light.',
  controversial: 'Take a bold, contrarian stance that invites debate. Be confident.',
  founder: 'Sound like a startup founder sharing lessons. Reference growth, product, or execution.',
};

export async function generateReply(tweetText: string, tone: string): Promise<{ reply: string; tokens: number }> {
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 120,
    messages: [
      {
        role: 'system',
        content: `You are a Twitter growth expert. Generate ONE reply to the given tweet.

Rules:
- Under 280 characters
- ${toneInstruction}
- Sound human, never robotic or spammy
- Add genuine value or spark conversation
- Sometimes ask a question to drive engagement
- NO hashtags unless absolutely relevant
- NO generic filler phrases like "Great point!" or "I agree!"

Return ONLY the reply text. Nothing else.`,
      },
      { role: 'user', content: `Tweet: "${tweetText}"\n\nGenerate a ${tone} reply:` },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim() || '';
  const tokens = completion.usage?.total_tokens || 0;
  return { reply, tokens };
}

export async function analyzeTweet(tweetText: string): Promise<{ analysis: object; tokens: number }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Analyze the Twitter tweet and return JSON with:
{
  "tone": string,
  "engagementScore": number (0-100),
  "viralPotential": "Low" | "Medium" | "High",
  "hooks": string[],
  "suggestions": string[],
  "sentiment": "positive" | "neutral" | "negative"
}`,
      },
      { role: 'user', content: tweetText },
    ],
  });

  const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
  return { analysis, tokens: completion.usage?.total_tokens || 0 };
}

export async function createTweet(topic: string, tone: string): Promise<{ tweet: string; tokens: number }> {
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `Create a high-performing tweet. ${toneInstruction}
Rules: Under 280 chars. No hashtag spam. Hook in first line. Human voice. Return only the tweet.`,
      },
      { role: 'user', content: `Topic: ${topic}` },
    ],
  });

  const tweet = completion.choices[0]?.message?.content?.trim() || '';
  return { tweet, tokens: completion.usage?.total_tokens || 0 };
}

export async function rewriteTweet(draftText: string, tone: string): Promise<{ rewrite: string; tokens: number }> {
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.smart;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `Rewrite this tweet draft to be more engaging. ${toneInstruction}
Rules: Keep original intent. Under 280 chars. Make it punchier. Return only the rewrite.`,
      },
      { role: 'user', content: `Draft: "${draftText}"` },
    ],
  });

  const rewrite = completion.choices[0]?.message?.content?.trim() || '';
  return { rewrite, tokens: completion.usage?.total_tokens || 0 };
}

export function buildPrompt(settings: any, input: string, mode: "tweet" | "reply") {
  const base = `
You are an elite Twitter growth strategist.

Tone: ${settings.tone}
Niche: ${settings.niche}
Hook Strength: ${settings.hookStrength}
Emoji Density: ${settings.emojiDensity}
CTA Style: ${settings.ctaStyle}
`;

  if (mode === "reply") {
    return `
${base}
Write a high-engagement reply to this comment:

"${input}"

Make it concise and impactful.
`;
  }

  if (!input || input.trim() === "") {
    return `
${base}
Generate a high-performing ${settings.format} tweet in the ${settings.niche} niche.
`;
  }

  return `
${base}
Create a ${settings.format} tweet based on:

"${input}"
`;
}
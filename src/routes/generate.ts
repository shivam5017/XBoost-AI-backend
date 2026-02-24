import express from "express";
import db from "../lib/db";
import { decrypt } from "../utils/encryption";
import { buildPrompt } from "../utils/promptBuilder";
import { authenticate } from "../middleware/auth";
import OpenAI from "openai";

const router = express.Router();

router.post("/", authenticate, async (req: any, res) => {
  const { input, mode } = req.body; // mode: tweet | reply

  const settings = await db.userSettings.findUnique({
    where: { userId: req.userId },
  });

  if (!settings) {
    return res.status(400).json({ error: "No settings configured" });
  }

  const apiKey = decrypt(settings.apiKeyEncrypted);

  const prompt = buildPrompt(settings, input, mode);

  try {
    if (settings.provider === "openai") {
      const client = new OpenAI({ apiKey });

      const response = await client.chat.completions.create({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      return res.json({
        output: response.choices[0].message.content,
      });
    }

    // You add other providers here similarly

    return res.status(400).json({ error: "Provider not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
import express from "express";
import db from "../lib/db";
import { authenticate } from "../middleware/auth";
import { encrypt } from "../utils/encryption";
import { validateProviderModel } from "../utils/providerValidator";

const router = express.Router();

/* SAVE SETTINGS */
router.post("/", authenticate, async (req: any, res) => {
  try {
    const {
      provider,
      model,
      apiKey,
      temperature,
      maxTokens,
      streaming,
      tone,
      niche,
      format,
      ctaStyle,
      emojiDensity,
      hookStrength,
      engagementBoost,
      autoThreadSplit,
    } = req.body;

    if (!validateProviderModel(provider, model)) {
      return res.status(400).json({
        error: "Model not allowed for selected provider",
      });
    }

    await db.userSettings.upsert({
      where: { userId: req.userId },
      update: {
        provider,
        model,
        temperature,
        maxTokens,
        streaming,
        tone,
        niche,
        format,
        ctaStyle,
        emojiDensity,
        hookStrength,
        engagementBoost,
        autoThreadSplit,
        apiKeyEncrypted: encrypt(apiKey),
      },
      create: {
        userId: req.userId,
        provider,
        model,
        temperature,
        maxTokens,
        streaming,
        tone,
        niche,
        format,
        ctaStyle,
        emojiDensity,
        hookStrength,
        engagementBoost,
        autoThreadSplit,
        apiKeyEncrypted: encrypt(apiKey),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SAVE SETTINGS ERROR:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

/* GET SETTINGS */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const settings = await db.userSettings.findUnique({
      where: { userId: req.userId },
    });

    if (!settings) {
      return res.json({});
    }

    // Never send encrypted key to frontend
    const { apiKeyEncrypted, ...safeSettings } = settings;

    res.json(safeSettings);
  } catch (err) {
    console.error("GET SETTINGS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

export default router;
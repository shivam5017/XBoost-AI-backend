import express from "express";
import db from "../lib/db";
import { authenticate } from "../middleware/auth";
import { encrypt } from "../utils/encryption";
import { validateProviderModel } from "../utils/providerValidator";

const router = express.Router();

/* SAVE SETTINGS */
router.post("/", authenticate, async (req: any, res) => {
  const data = req.body;

  if (!validateProviderModel(data.provider, data.model)) {
    return res.status(400).json({
      error: "Model not allowed for selected provider",
    });
  }

  try {
    await db.userSettings.upsert({
      where: { userId: req.userId },
      update: {
        ...data,
        apiKeyEncrypted: encrypt(data.apiKey),
      },
      create: {
        ...data,
        userId: req.userId,
        apiKeyEncrypted: encrypt(data.apiKey),
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

/* GET SETTINGS */
router.get("/", authenticate, async (req: any, res) => {
  const settings = await db.userSettings.findUnique({
    where: { userId: req.userId },
  });

  res.json(settings);
});

export default router;
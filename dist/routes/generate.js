"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../lib/db"));
const encryption_1 = require("../utils/encryption");
const promptBuilder_1 = require("../utils/promptBuilder");
const auth_1 = require("../middleware/auth");
const openai_1 = __importDefault(require("openai"));
const router = express_1.default.Router();
router.post("/", auth_1.authenticate, async (req, res) => {
    const { input, mode } = req.body; // mode: tweet | reply
    const settings = await db_1.default.userSettings.findUnique({
        where: { userId: req.userId },
    });
    if (!settings) {
        return res.status(400).json({ error: "No settings configured" });
    }
    const apiKey = (0, encryption_1.decrypt)(settings.apiKeyEncrypted);
    const prompt = (0, promptBuilder_1.buildPrompt)(settings, input, mode);
    try {
        if (settings.provider === "openai") {
            const client = new openai_1.default({ apiKey });
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
    }
    catch (err) {
        res.status(500).json({ error: "Generation failed" });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const encryption_1 = require("../utils/encryption");
const providerValidator_1 = require("../utils/providerValidator");
const router = express_1.default.Router();
/* SAVE SETTINGS */
router.post("/", auth_1.authenticate, async (req, res) => {
    const data = req.body;
    if (!(0, providerValidator_1.validateProviderModel)(data.provider, data.model)) {
        return res.status(400).json({
            error: "Model not allowed for selected provider",
        });
    }
    try {
        await db_1.default.userSettings.upsert({
            where: { userId: req.userId },
            update: {
                ...data,
                apiKeyEncrypted: (0, encryption_1.encrypt)(data.apiKey),
            },
            create: {
                ...data,
                userId: req.userId,
                apiKeyEncrypted: (0, encryption_1.encrypt)(data.apiKey),
            },
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to save settings" });
    }
});
/* GET SETTINGS */
router.get("/", auth_1.authenticate, async (req, res) => {
    const settings = await db_1.default.userSettings.findUnique({
        where: { userId: req.userId },
    });
    res.json(settings);
});
exports.default = router;

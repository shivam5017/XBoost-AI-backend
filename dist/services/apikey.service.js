"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_AI_PROVIDERS = void 0;
exports.upsertProviderApiKey = upsertProviderApiKey;
exports.removeProviderApiKey = removeProviderApiKey;
exports.getProviderApiKey = getProviderApiKey;
exports.listStoredProviders = listStoredProviders;
const crypto_1 = __importDefault(require("crypto"));
exports.ALLOWED_AI_PROVIDERS = [
    "openai",
    "chatgpt",
    "anthropic",
    "google",
    "xai",
    "cohere",
    "mistral",
];
const PREFIX = "encv1:";
function isProvider(value) {
    return exports.ALLOWED_AI_PROVIDERS.includes(value);
}
function normalizeProvider(input) {
    const raw = String(input || "openai").trim().toLowerCase();
    if (!isProvider(raw)) {
        throw new Error(`Unsupported provider "${raw}"`);
    }
    return raw;
}
function getEncryptionSecret() {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET ||
        process.env.ENCRYPTION_SECRET ||
        process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Missing API_KEY_ENCRYPTION_SECRET");
    }
    return secret;
}
function getCipherKey() {
    return crypto_1.default.createHash("sha256").update(getEncryptionSecret()).digest();
}
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(12);
    const key = getCipherKey();
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}
function decrypt(payload) {
    if (!payload)
        return null;
    if (!payload.startsWith(PREFIX))
        return payload; // legacy plaintext support
    const body = payload.slice(PREFIX.length);
    const [ivB64, tagB64, encB64] = body.split(".");
    if (!ivB64 || !tagB64 || !encB64)
        return null;
    try {
        const iv = Buffer.from(ivB64, "base64");
        const tag = Buffer.from(tagB64, "base64");
        const encrypted = Buffer.from(encB64, "base64");
        const key = getCipherKey();
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    }
    catch {
        return null;
    }
}
function validateApiKey(provider, apiKey) {
    const key = apiKey.trim();
    if (key.length < 16 || key.length > 256) {
        throw new Error("Invalid API key length");
    }
    const rules = {
        openai: /^sk-[a-zA-Z0-9\-_]{16,}$/,
        chatgpt: /^sk-[a-zA-Z0-9\-_]{16,}$/,
        anthropic: /^sk-ant-[a-zA-Z0-9\-_]{16,}$/,
        google: /^AIza[0-9A-Za-z\-_]{20,}$/,
        xai: /^xai-[a-zA-Z0-9\-_]{16,}$/,
        cohere: /^[a-zA-Z0-9\-_]{24,}$/,
        mistral: /^[a-zA-Z0-9\-_]{24,}$/,
    };
    const re = rules[provider];
    if (!re.test(key)) {
        throw new Error(`Invalid ${provider} API key format`);
    }
}
function parseStore(raw) {
    const decoded = raw ? decrypt(raw) : null;
    if (!decoded) {
        return { v: 1, providers: {}, updatedAt: new Date().toISOString() };
    }
    // Legacy value was plain OpenAI key in DB
    if (!decoded.startsWith("{")) {
        return {
            v: 1,
            providers: { openai: decoded },
            updatedAt: new Date().toISOString(),
        };
    }
    try {
        const parsed = JSON.parse(decoded);
        if (!parsed?.providers)
            throw new Error("invalid");
        return {
            v: 1,
            providers: parsed.providers,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
    }
    catch {
        return { v: 1, providers: {}, updatedAt: new Date().toISOString() };
    }
}
function serializeStore(store) {
    return encrypt(JSON.stringify(store));
}
function upsertProviderApiKey(existingRaw, providerInput, apiKeyInput) {
    const provider = normalizeProvider(providerInput);
    const apiKey = String(apiKeyInput || "").trim();
    validateApiKey(provider, apiKey);
    const store = parseStore(existingRaw);
    store.providers[provider] = apiKey;
    store.updatedAt = new Date().toISOString();
    return serializeStore(store);
}
function removeProviderApiKey(existingRaw, providerInput) {
    const store = parseStore(existingRaw);
    if (!providerInput)
        return null;
    const provider = normalizeProvider(providerInput);
    delete store.providers[provider];
    const hasAny = Object.values(store.providers).some(Boolean);
    if (!hasAny)
        return null;
    store.updatedAt = new Date().toISOString();
    return serializeStore(store);
}
function getProviderApiKey(existingRaw, providerInput) {
    const provider = normalizeProvider(providerInput);
    const store = parseStore(existingRaw);
    return store.providers[provider] || null;
}
function listStoredProviders(existingRaw) {
    const store = parseStore(existingRaw);
    return Object.entries(store.providers)
        .filter(([, value]) => Boolean(value))
        .map(([provider, value]) => ({
        provider: provider,
        masked: `••••••••••••${String(value).slice(-4)}`,
    }));
}

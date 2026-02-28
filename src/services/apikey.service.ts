import crypto from "crypto";

export const ALLOWED_AI_PROVIDERS = [
  "openai",
  "chatgpt",
  "anthropic",
  "google",
  "xai",
  "cohere",
  "mistral",
] as const;

export type AIProvider = (typeof ALLOWED_AI_PROVIDERS)[number];

type KeyStore = {
  v: 1;
  providers: Partial<Record<AIProvider, string>>;
  updatedAt: string;
};

const PREFIX = "encv1:";

function isProvider(value: string): value is AIProvider {
  return (ALLOWED_AI_PROVIDERS as readonly string[]).includes(value);
}

function normalizeProvider(input?: string | null): AIProvider {
  const raw = String(input || "openai").trim().toLowerCase();
  if (!isProvider(raw)) {
    throw new Error(`Unsupported provider "${raw}"`);
  }
  return raw;
}

function getEncryptionSecret(): string {
  const secret =
    process.env.API_KEY_ENCRYPTION_SECRET ||
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing API_KEY_ENCRYPTION_SECRET");
  }
  return secret;
}

function getCipherKey(): Buffer {
  return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getCipherKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decrypt(payload: string): string | null {
  if (!payload) return null;
  if (!payload.startsWith(PREFIX)) return payload; // legacy plaintext support

  const body = payload.slice(PREFIX.length);
  const [ivB64, tagB64, encB64] = body.split(".");
  if (!ivB64 || !tagB64 || !encB64) return null;

  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(encB64, "base64");
    const key = getCipherKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function validateApiKey(provider: AIProvider, apiKey: string): void {
  const key = apiKey.trim();
  if (key.length < 16 || key.length > 256) {
    throw new Error("Invalid API key length");
  }

  const rules: Record<AIProvider, RegExp> = {
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

function parseStore(raw: string | null | undefined): KeyStore {
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
    const parsed = JSON.parse(decoded) as KeyStore;
    if (!parsed?.providers) throw new Error("invalid");
    return {
      v: 1,
      providers: parsed.providers,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { v: 1, providers: {}, updatedAt: new Date().toISOString() };
  }
}

function serializeStore(store: KeyStore): string {
  return encrypt(JSON.stringify(store));
}

export function upsertProviderApiKey(
  existingRaw: string | null | undefined,
  providerInput: string | null | undefined,
  apiKeyInput: string,
): string {
  const provider = normalizeProvider(providerInput);
  const apiKey = String(apiKeyInput || "").trim();
  validateApiKey(provider, apiKey);

  const store = parseStore(existingRaw);
  store.providers[provider] = apiKey;
  store.updatedAt = new Date().toISOString();
  return serializeStore(store);
}

export function removeProviderApiKey(
  existingRaw: string | null | undefined,
  providerInput?: string | null,
): string | null {
  const store = parseStore(existingRaw);
  if (!providerInput) return null;
  const provider = normalizeProvider(providerInput);
  delete store.providers[provider];
  const hasAny = Object.values(store.providers).some(Boolean);
  if (!hasAny) return null;
  store.updatedAt = new Date().toISOString();
  return serializeStore(store);
}

export function getProviderApiKey(
  existingRaw: string | null | undefined,
  providerInput: string,
): string | null {
  const provider = normalizeProvider(providerInput);
  const store = parseStore(existingRaw);
  return store.providers[provider] || null;
}

export function listStoredProviders(
  existingRaw: string | null | undefined,
): Array<{ provider: AIProvider; masked: string }> {
  const store = parseStore(existingRaw);
  return Object.entries(store.providers)
    .filter(([, value]) => Boolean(value))
    .map(([provider, value]) => ({
      provider: provider as AIProvider,
      masked: `••••••••••••${String(value).slice(-4)}`,
    }));
}


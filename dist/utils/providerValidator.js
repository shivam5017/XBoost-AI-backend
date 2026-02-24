"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProviderModel = validateProviderModel;
const PROVIDER_MODELS = {
    openai: ["gpt-4o", "gpt-4.1", "gpt-4-turbo"],
    anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    gemini: ["gemini-1.5-pro", "gemini-1.5-flash"],
    grok: ["grok-2", "grok-1.5"],
    mistral: ["mistral-large", "mixtral-8x7b"],
    deepseek: ["deepseek-chat", "deepseek-coder"],
    cohere: ["command-r", "command-r-plus"],
    openrouter: ["auto", "anthropic/claude-3", "openai/gpt-4o"],
    custom: ["custom-model"],
};
function validateProviderModel(provider, model) {
    const allowed = PROVIDER_MODELS[provider];
    if (!allowed)
        return false;
    return allowed.includes(model);
}

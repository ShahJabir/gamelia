import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  headers: process.env.ANTHROPIC_WORKSPACE_ID
    ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
    : undefined,
});

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getLanguageModel(modelId: string = "gemini-3.6-flash") {
  switch (modelId) {
    // --- Google Gemini ---
    case "gemini-3.6-flash":
    case "gemini-3.7-flash":
    case "gemini-3.5-flash-lite":
    case "gemini-3.5-flash":
    case "gemini-flash-latest":
    case "gemini-2.5-flash":
    case "gemini-2.0-flash":
    case "gemini-1.5-flash":
    case "gemini-2.5-pro":
      if (
        !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
        !process.env.GEMINI_API_KEY
      ) {
        throw new Error(
          "GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local. Please get a free API key at https://aistudio.google.com/apikey and add it to .env.local."
        );
      }
      // Gracefully map decommissioned models to gemini-3.6-flash
      if (
        modelId === "gemini-2.5-flash" ||
        modelId === "gemini-2.0-flash" ||
        modelId === "gemini-1.5-flash"
      ) {
        return google("gemini-3.6-flash");
      }
      return google(modelId);

    // --- Claude / Anthropic ---
    case "claude-3-5-sonnet":
    case "claude-3-5-sonnet-20241022":
    case "claude-3-5-sonnet-latest":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not set in .env.local.");
      }
      return anthropic("claude-3-5-sonnet-20241022");

    case "fable-5-1":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not set in .env.local.");
      }
      return anthropic("claude-3-5-sonnet-20241022");

    // --- Future Layout (GPT-6 Astra, Qwen, etc.) ---
    case "gpt-6-astra":
    case "gpt-4o":
      if (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY
      ) {
        return google("gemini-3.6-flash");
      }
      throw new Error(
        "OpenAI integration for GPT-6 Astra is coming soon. Please select Gemini 3.6 Flash."
      );

    case "qwen-2.5-coder":
      if (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY
      ) {
        return google("gemini-3.6-flash");
      }
      throw new Error(
        "Hugging Face integration for Qwen 2.5 is coming soon. Please select Gemini 3.6 Flash."
      );

    // --- OpenRouter (Google: Gemma 4 31B Free) ---
    case "google/gemma-4-31b-it:free":
    case "gemma-4-31b-it:free":
    case "gemma-4-31b":
      if (process.env.OPENROUTER_API_KEY) {
        return openrouter("google/gemma-4-31b-it:free");
      }
      // Graceful fallback to gemini-3.5-flash-lite if OPENROUTER_API_KEY is not yet configured
      if (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY
      ) {
        return google("gemini-3.5-flash-lite");
      }
      return openrouter("google/gemma-4-31b-it:free");

    default:
      if (modelId.startsWith("google/gemma") || modelId.startsWith("openrouter/")) {
        const cleanId = modelId.replace(/^openrouter\//, "");
        if (process.env.OPENROUTER_API_KEY) {
          return openrouter(cleanId);
        }
        return google("gemini-3.5-flash-lite");
      }
      if (modelId.startsWith("gemini")) {
        return google("gemini-3.6-flash");
      }
      if (modelId.startsWith("claude")) {
        return anthropic(modelId);
      }
      return google("gemini-3.6-flash");
  }
}

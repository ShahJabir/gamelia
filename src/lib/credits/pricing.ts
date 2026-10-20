import type { LanguageModelUsage } from "ai";

/**
 * Model token pricing per million tokens in USD.
 * Fresh input, cache input (cache read), cache writes, and output are priced differently.
 */
export interface ModelPricing {
  /** Cost per million fresh (non-cached) input tokens in USD */
  freshInput: number;
  /** Cost per million cached input tokens read in USD */
  cacheInput: number;
  /** Cost per million cached input tokens written in USD */
  cacheWrites: number;
  /** Cost per million output completion tokens in USD */
  output: number;
}

/**
 * Pricing rates per million tokens for all supported models.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // --- Google Gemini ---
  "gemini-3.6-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-3.7-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-3.5-flash-lite": {
    freshInput: 0.075,
    cacheInput: 0.01875,
    cacheWrites: 0.075,
    output: 0.3,
  },
  "gemini-3.5-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-flash-latest": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-2.5-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-2.0-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-1.5-flash": {
    freshInput: 0.15,
    cacheInput: 0.0375,
    cacheWrites: 0.15,
    output: 0.6,
  },
  "gemini-2.5-pro": {
    freshInput: 1.25,
    cacheInput: 0.3125,
    cacheWrites: 1.25,
    output: 5.0,
  },

  // --- Anthropic Claude ---
  "claude-3-5-sonnet": {
    freshInput: 3.0,
    cacheInput: 0.3,
    cacheWrites: 3.75,
    output: 15.0,
  },
  "claude-3-5-sonnet-20241022": {
    freshInput: 3.0,
    cacheInput: 0.3,
    cacheWrites: 3.75,
    output: 15.0,
  },
  "claude-3-5-sonnet-latest": {
    freshInput: 3.0,
    cacheInput: 0.3,
    cacheWrites: 3.75,
    output: 15.0,
  },
  "fable-5-1": {
    freshInput: 3.0,
    cacheInput: 0.3,
    cacheWrites: 3.75,
    output: 15.0,
  },

  // --- OpenAI ---
  "gpt-4o": {
    freshInput: 2.5,
    cacheInput: 1.25,
    cacheWrites: 2.5,
    output: 10.0,
  },
  "gpt-6-astra": {
    freshInput: 2.5,
    cacheInput: 1.25,
    cacheWrites: 2.5,
    output: 10.0,
  },

  // --- Open Source / Hugging Face ---
  "qwen-2.5-coder": {
    freshInput: 0.2,
    cacheInput: 0.05,
    cacheWrites: 0.2,
    output: 0.6,
  },

  // --- OpenRouter (Free) ---
  "google/gemma-4-31b-it:free": {
    freshInput: 0.0,
    cacheInput: 0.0,
    cacheWrites: 0.0,
    output: 0.0,
  },
  "gemma-4-31b-it:free": {
    freshInput: 0.0,
    cacheInput: 0.0,
    cacheWrites: 0.0,
    output: 0.0,
  },
  "gemma-4-31b": {
    freshInput: 0.0,
    cacheInput: 0.0,
    cacheWrites: 0.0,
    output: 0.0,
  },
};

export const DEFAULT_MODEL_PRICING: ModelPricing =
  MODEL_PRICING["gemini-3.6-flash"];

/**
 * Resolves pricing for a given model ID with sensible fallbacks.
 */
export function getModelPricing(modelId?: string): ModelPricing {
  if (!modelId) {
    return DEFAULT_MODEL_PRICING;
  }

  if (MODEL_PRICING[modelId]) {
    return MODEL_PRICING[modelId];
  }

  if (modelId.startsWith("claude")) {
    return MODEL_PRICING["claude-3-5-sonnet"];
  }

  if (modelId.startsWith("gpt")) {
    return MODEL_PRICING["gpt-4o"];
  }

  if (modelId.includes("free") || modelId.startsWith("google/gemma")) {
    return MODEL_PRICING["google/gemma-4-31b-it:free"];
  }

  if (modelId.startsWith("gemini")) {
    return MODEL_PRICING["gemini-3.6-flash"];
  }

  return DEFAULT_MODEL_PRICING;
}

const ONE_MILLION = BigInt("1000000");
const HALF_MILLION = BigInt("500000");
const BILLION = BigInt("1000000000");

function tokenCostInBillionths(tokens: number, rateDollars: number): bigint {
  if (tokens <= 0 || rateDollars <= 0) return BigInt(0);

  // Rate in billionths of a dollar per 1,000,000 tokens
  const rateInBillionthsPerMillion = BigInt(Math.round(rateDollars * 1000000000));
  const tokenCount = BigInt(tokens);

  // Calculate: (tokens * ratePerMillion + halfMillion) / oneMillion (rounded integer division)
  return (tokenCount * rateInBillionthsPerMillion + HALF_MILLION) / ONE_MILLION;
}

/**
 * Turns one step's token usage into a cost amount in billionths of a dollar.
 * Fresh input, cache input, cache writes, and output are priced differently.
 *
 * @param usage LanguageModelUsage from the step
 * @param modelId The model ID used for generation
 * @returns Amount in billionths of a dollar (bigint)
 */
export function calculateStepCost(
  usage: LanguageModelUsage | undefined,
  modelId: string = "gemini-3.6-flash",
): bigint {
  if (!usage) {
    return BigInt(0);
  }

  const pricing = getModelPricing(modelId);

  // 1. Cache input (cache read tokens)
  const cacheInput = usage.inputTokenDetails?.cacheReadTokens ?? 0;

  // 2. Fresh input (non-cached prompt tokens)
  const noCache = usage.inputTokenDetails?.noCacheTokens;
  const freshInput =
    noCache !== undefined
      ? noCache
      : Math.max(0, (usage.inputTokens ?? 0) - cacheInput);

  // 3. Cache writes (tokens written to prompt cache)
  const cacheWrites = usage.inputTokenDetails?.cacheWriteTokens ?? 0;

  // 4. Output tokens
  const output =
    usage.outputTokens ??
    (usage.outputTokenDetails?.textTokens ?? 0) +
      (usage.outputTokenDetails?.reasoningTokens ?? 0);

  const freshCost = tokenCostInBillionths(freshInput, pricing.freshInput);
  const cacheInputCost = tokenCostInBillionths(cacheInput, pricing.cacheInput);
  const cacheWritesCost = tokenCostInBillionths(cacheWrites, pricing.cacheWrites);
  const outputCost = tokenCostInBillionths(output, pricing.output);

  return freshCost + cacheInputCost + cacheWritesCost + outputCost;
}

export default calculateStepCost;

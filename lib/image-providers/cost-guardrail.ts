export interface ModelCostInfo {
  estimatedCost: number; // in USD
  fallbackModel?: string;
  category: "edit" | "generation";
}

export const MAX_ALLOWED_COST_USD = 0.05; // Strict hard cap
export const COST_WARNING_THRESHOLD_USD = 0.04; // Trigger fallback threshold

export const MODEL_PRICING_TABLE: Record<string, ModelCostInfo> = {
  // Ultra-low cost (< $0.02)
  "cf.flux-2-klein-4b": {
    estimatedCost: 0.018,
    category: "generation",
  },

  // Low cost ($0.02 - $0.035)
  "gpt-image-1-mini": {
    estimatedCost: 0.025,
    category: "generation",
  },
  "qwen-image-plus": {
    estimatedCost: 0.03,
    category: "generation",
  },
  "seedream-4-5-251128": {
    estimatedCost: 0.03,
    category: "generation",
  },
  "qwen-image": {
    estimatedCost: 0.03,
    category: "generation",
  },
  "qwen-image-edit": {
    estimatedCost: 0.035,
    category: "edit",
  },
  "qwen-image-edit-plus": {
    estimatedCost: 0.035,
    category: "edit",
  },
  "tencent/seededit-3.0": {
    estimatedCost: 0.03,
    category: "edit",
  },
  "gemini-2.5-flash-image": {
    estimatedCost: 0.039,
    category: "edit",
  },

  // At limit ($0.04)
  "black-forest-labs/flux-kontext-pro": {
    estimatedCost: 0.04,
    category: "edit",
  },

  // Over-budget models (> $0.04 / $0.05) - must trigger fallback
  "gpt-image-1.5": {
    estimatedCost: 0.07,
    fallbackModel: "gpt-image-1-mini",
    category: "generation",
  },
  "gemini-3.1-flash-image": {
    estimatedCost: 0.067,
    fallbackModel: "gemini-2.5-flash-image",
    category: "edit",
  },
  "qwen-image-edit-max": {
    estimatedCost: 0.075,
    fallbackModel: "qwen-image-edit-plus",
    category: "edit",
  },
  "gpt-image-2": {
    estimatedCost: 0.08,
    fallbackModel: "cf.flux-2-klein-4b",
    category: "generation",
  },
  "gemini-3-pro-image": {
    estimatedCost: 0.134,
    fallbackModel: "gemini-2.5-flash-image",
    category: "edit",
  },
};

export interface GuardrailResult {
  allowed: boolean;
  effectiveModel: string;
  originalModel: string;
  estimatedCost: number;
  blocked: boolean;
  fellBack: boolean;
  reason?: string;
}

/**
 * Enforces strict budget caps ($0.05 limit) and triggers automatic fallback
 * when model costs exceed $0.04 (e.g. gpt-image-1.5 -> gpt-image-1-mini).
 */
export function checkCostGuardrail(requestedModel: string): GuardrailResult {
  const modelInfo = MODEL_PRICING_TABLE[requestedModel];

  // If model is unknown, default to a safe estimate of $0.035
  const cost = modelInfo ? modelInfo.estimatedCost : 0.035;

  if (cost > COST_WARNING_THRESHOLD_USD || cost > MAX_ALLOWED_COST_USD) {
    const fallback =
      modelInfo?.fallbackModel ||
      (modelInfo?.category === "edit" ? "qwen-image-edit-plus" : "gpt-image-1-mini");

    const fallbackInfo = MODEL_PRICING_TABLE[fallback];
    const fallbackCost = fallbackInfo ? fallbackInfo.estimatedCost : 0.025;

    return {
      allowed: true,
      effectiveModel: fallback,
      originalModel: requestedModel,
      estimatedCost: fallbackCost,
      blocked: true,
      fellBack: true,
      reason: `Cost guardrail triggered: '${requestedModel}' costs ~$${cost.toFixed(
        3
      )} which exceeds the $${COST_WARNING_THRESHOLD_USD.toFixed(
        2
      )} threshold ($${MAX_ALLOWED_COST_USD.toFixed(
        2
      )} hard cap). Aborted call to high-tier model and fell back to '${fallback}' (~$${fallbackCost.toFixed(
        3
      )}).`,
    };
  }

  return {
    allowed: true,
    effectiveModel: requestedModel,
    originalModel: requestedModel,
    estimatedCost: cost,
    blocked: false,
    fellBack: false,
  };
}

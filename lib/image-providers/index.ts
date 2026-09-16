import {
  HairEditRequest,
  HairEditResult,
  ModelOption,
  ProviderId,
  ProviderStatus,
} from "./types";
import { generateGeminiHairEdit } from "./gemini";
import { generateReplicateHairEdit } from "./replicate";
import { generateGenericHairEdit } from "./generic";

export * from "./types";
export * from "./prompts";
export * from "./cost-guardrail";

export function getProviderStatus(): ProviderStatus {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    replicate: Boolean(process.env.REPLICATE_API_TOKEN),
    nineRouter: Boolean(
      process.env.NINE_ROUTER_API_KEY && process.env.NINE_ROUTER_BASE_URL
    ),
    avalAi: Boolean(
      process.env.AVALAI_API_KEY && process.env.AVALAI_BASE_URL
    ),
  };
}

export function getSupportedModels(): ModelOption[] {
  const status = getProviderStatus();

  const models: ModelOption[] = [
    {
      id: "gemini-3.1-flash-image",
      name: "Gemini 3.1 Flash Image",
      provider: "gemini",
      description: "Google AI Studio • Fast, photorealistic hairstyle styling",
      isConfigured: status.gemini,
      costEstimate: "Free tier / ~$0.067/img",
    },
    {
      id: "gemini-2.5-flash-image",
      name: "Gemini 2.5 Flash Image",
      provider: "gemini",
      description: "Google AI Studio • Ultra-fast, lightweight face preservation",
      isConfigured: status.gemini,
      costEstimate: "Free tier / ~$0.039/img",
    },
    {
      id: "black-forest-labs/flux-kontext-pro",
      name: "FLUX Kontext Pro",
      provider: "replicate",
      description: "Replicate • State-of-the-art context & feature preservation",
      isConfigured: status.replicate,
      costEstimate: "~$0.04/img",
    },
    {
      id: "qwen/qwen-image-edit-plus",
      name: "Qwen Image Edit Plus",
      provider: "replicate",
      description: "Replicate • High-accuracy dual-image reference transfer",
      isConfigured: status.replicate,
      costEstimate: "~$0.03/img",
    },
    {
      id: "tencent/seededit-3.0",
      name: "SeedEdit 3.0",
      provider: "replicate",
      description: "Replicate • Fine-grained identity-locked hair editing",
      isConfigured: status.replicate,
      costEstimate: "~$0.03/img",
    },
  ];

  if (process.env.NINE_ROUTER_BASE_URL) {
    models.push({
      id: process.env.NINE_ROUTER_IMAGE_MODEL || "9router-image-model",
      name: `9Router (${process.env.NINE_ROUTER_IMAGE_MODEL || "Custom"})`,
      provider: "ninerouter",
      description: "9Router • OpenAI-compatible router endpoint",
      isConfigured: status.nineRouter,
      costEstimate: "Custom router pricing",
    });
  }

  // AvalAI Models (Selectable individually in Web Model Selector)
  if (process.env.AVALAI_BASE_URL || status.avalAi) {
    models.push(
      {
        id: "qwen-image-edit-plus",
        name: "Qwen Image Edit Plus (AvalAI)",
        provider: "avalai",
        description: "AvalAI.ir • Verified active • Best for hairstyle transfer & face lock",
        isConfigured: status.avalAi,
        costEstimate: "~$0.035/img (Within $0.05 cap)",
      },
      {
        id: "qwen-image-plus",
        name: "Qwen Image Plus (AvalAI)",
        provider: "avalai",
        description: "AvalAI.ir • Verified active • Photorealistic hair generation",
        isConfigured: status.avalAi,
        costEstimate: "~$0.030/img (Within $0.05 cap)",
      },
      {
        id: "gpt-image-1-mini",
        name: "GPT Image 1 Mini (AvalAI)",
        provider: "avalai",
        description: "AvalAI.ir • Verified active • Lightweight budget portrait model",
        isConfigured: status.avalAi,
        costEstimate: "~$0.025/img (Within $0.05 cap)",
      },
      {
        id: "cf.flux-2-klein-4b",
        name: "FLUX 2 Klein 4B (AvalAI)",
        provider: "avalai",
        description: "AvalAI.ir • Ultra-low cost generation",
        isConfigured: status.avalAi,
        costEstimate: "~$0.018/img (Within $0.05 cap)",
      },
      {
        id: "gpt-image-1.5",
        name: "GPT Image 1.5 (AvalAI - Guardrailed)",
        provider: "avalai",
        description: "AvalAI.ir • Exceeds $0.04 limit (Auto-falls back to mini)",
        isConfigured: status.avalAi,
        costEstimate: "~$0.070/img (Auto fallback)",
      },
      {
        id: "seedream-4-5-251128",
        name: "SeeDream 4.5 (AvalAI - Deprecated)",
        provider: "avalai",
        description: "AvalAI.ir • Deprecated by upstream provider",
        isConfigured: status.avalAi,
        costEstimate: "~$0.030/img (Deprecated)",
      }
    );
  }

  return models;
}

export async function generateHairEdit(
  request: HairEditRequest
): Promise<HairEditResult> {
  const models = getSupportedModels();
  
  // Resolve model and provider
  let modelId = request.model;
  let providerId = request.provider;

  if (modelId && !providerId) {
    const matched = models.find((m) => m.id === modelId);
    if (matched) {
      providerId = matched.provider;
    }
  }

  // Fallback to first configured model if none chosen or specified
  if (!modelId || !providerId) {
    const firstConfigured = models.find((m) => m.isConfigured);
    if (firstConfigured) {
      modelId = firstConfigured.id;
      providerId = firstConfigured.provider;
    } else {
      // Default to Gemini 3.1 Flash Image
      modelId = "gemini-3.1-flash-image";
      providerId = "gemini";
    }
  }

  // Cost guardrail: enforce $0.05 limit and fallback for models > $0.04
  const { checkCostGuardrail } = await import("./cost-guardrail");
  const costCheck = checkCostGuardrail(modelId);
  if (costCheck.fellBack) {
    console.warn(`[Cost Guardrail] ${costCheck.reason}`);
    modelId = costCheck.effectiveModel;
  }

  // Verify provider credentials
  const status = getProviderStatus();
  if (providerId === "gemini" && !status.gemini) {
    throw new Error("GEMINI_API_KEY is not configured in .env.local");
  }
  if (providerId === "replicate" && !status.replicate) {
    throw new Error("REPLICATE_API_TOKEN is not configured in .env.local");
  }
  if (providerId === "ninerouter" && !status.nineRouter) {
    throw new Error("NINE_ROUTER_API_KEY is not configured in .env.local");
  }
  if (providerId === "avalai" && !status.avalAi) {
    throw new Error("AVALAI_API_KEY is not configured in .env.local");
  }

  const updatedRequest: HairEditRequest = {
    ...request,
    model: modelId,
    provider: providerId,
  };

  switch (providerId) {
    case "gemini":
      return await generateGeminiHairEdit(updatedRequest);

    case "replicate":
      return await generateReplicateHairEdit(updatedRequest);

    case "ninerouter":
      return await generateGenericHairEdit(updatedRequest, {
        name: "9Router",
        apiKey: process.env.NINE_ROUTER_API_KEY,
        baseUrl: process.env.NINE_ROUTER_BASE_URL,
        modelId: process.env.NINE_ROUTER_IMAGE_MODEL || modelId,
      });

    case "avalai":
      return await generateGenericHairEdit(updatedRequest, {
        name: "AvalAI",
        apiKey: process.env.AVALAI_API_KEY,
        baseUrl: process.env.AVALAI_BASE_URL,
        modelId: process.env.AVALAI_IMAGE_MODEL || modelId,
      });

    case "generic":
      return await generateGenericHairEdit(updatedRequest, {
        name: "Generic",
        apiKey: process.env.GENERIC_API_KEY,
        baseUrl: process.env.GENERIC_BASE_URL,
        modelId: process.env.GENERIC_IMAGE_MODEL || modelId,
      });

    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

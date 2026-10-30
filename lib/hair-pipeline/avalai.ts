import { HairEditMode, HairEditResult, ModelOption } from "@/lib/image-providers/types";
import { MODE_1_BASE_PROMPT, MODE_2_BASE_PROMPT } from "@/lib/image-providers/prompts";
import { PreparedImage, runImageProcessor } from "./python";

const DEFAULT_PRIORITY = [
  "gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2",
  "gpt-image-1.5", "flux.1-kontext-pro", "flux.2-pro",
];
const AUTO_EDIT_MODELS = new Set(["gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2"]);
export function isAutoAvalaiEditModel(id: string) { return AUTO_EDIT_MODELS.has(id); }
interface AvalaiModel { id: string; supported_endpoints?: string[]; }
let cachedModels: { expires: number; models: AvalaiModel[] } | undefined;

function config() {
  const apiKey = process.env.AVALAI_API_KEY;
  const baseUrl = (process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1").replace(/\/+$/, "");
  if (!apiKey) throw new Error("AVALAI_API_KEY is not configured in .env.local");
  return { apiKey, baseUrl };
}

async function availableModels(): Promise<AvalaiModel[]> {
  if (cachedModels && cachedModels.expires > Date.now()) return cachedModels.models;
  const { apiKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`AvalAI model discovery failed (${response.status})`);
  const data = await response.json();
  const models: AvalaiModel[] = (Array.isArray(data.data) ? data.data : [])
    .filter((model: AvalaiModel) => typeof model.id === "string");
  cachedModels = { models, expires: Date.now() + 10 * 60_000 };
  return models;
}

function priority() {
  const custom = process.env.AVALAI_EDIT_MODEL_PRIORITY?.split(",").map((x) => x.trim()).filter(Boolean);
  return custom?.length ? custom : DEFAULT_PRIORITY;
}

export async function getAvalaiEditModels(): Promise<ModelOption[]> {
  if (!process.env.AVALAI_API_KEY) return [];
  const ranked = priority();
  return (await availableModels())
    .filter((model) => model.supported_endpoints?.some((endpoint) => endpoint.replace(/^\/+/, "") === "v1/images/edits"))
    .sort((a, b) => {
      const aRank = ranked.indexOf(a.id);
      const bRank = ranked.indexOf(b.id);
      return (aRank < 0 ? ranked.length : aRank) - (bRank < 0 ? ranked.length : bRank)
        || a.id.localeCompare(b.id);
    })
    .map(({ id }) => {
      const unverifiedFlux = id === "flux.2-pro";
      const documentedGptEdit = isAutoAvalaiEditModel(id);
      return {
        id,
        name: `${id} (AvalAI)`,
        provider: "avalai" as const,
        description: unverifiedFlux
          ? "Catalog advertises edits; FLUX.2 Pro edit contract is unverified"
          : documentedGptEdit
            ? "Available for image editing on this AvalAI account"
            : "Catalog advertises edits; two-image mask support is unverified",
        isConfigured: true,
        costEstimate: "Usage billed by AvalAI",
      };
    });
}

function asBlob(base64: string) {
  return new Blob([Uint8Array.from(Buffer.from(base64, "base64"))], { type: "image/png" });
}

async function lookupActualCost(requestId: string, apiKey: string): Promise<number | undefined> {
  for (const delay of [0, 1500, 3500]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch("https://api.avalai.ir/user/v1/transactions/lookup", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_ids: [requestId] }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) break;
      const data = await response.json();
      const raw = data?.transactions?.find((item: { id?: string }) => item.id === requestId)?.cost?.unit;
      const cost = Number(raw);
      if (raw != null && Number.isFinite(cost) && cost >= 0) return cost;
    } catch {
      // Keep the request ID for later reconciliation if the lookup is delayed.
    }
  }
  return undefined;
}

async function recordCost(model: string, requestId: string | null, apiKey: string, providerEstimate?: unknown) {
  const actualCost = requestId ? await lookupActualCost(requestId, apiKey) : undefined;
  const estimate = providerEstimate == null ? undefined : Number(providerEstimate);
  console.info("AvalAI edit cost", JSON.stringify({ model, requestId, actualCostUsd: actualCost,
    providerEstimateUsd: Number.isFinite(estimate) ? estimate : undefined }));
  return actualCost;
}

async function edit(model: string, mode: HairEditMode, prepared: PreparedImage): Promise<{ image: string; costUsd?: number }> {
  const { apiKey, baseUrl } = config();
  const form = new FormData();
  form.append("model", model);
  const prompt = mode === "try-hairstyle"
    ? `${MODE_1_BASE_PROMPT}\n\nThe supplied mask applies only to Image 1. Its transparent area is the allowed hair edit region. Preserve the opaque area and the exact placement of the target person within the square canvas. Image 2 is a reference, not a mask.`
    : MODE_2_BASE_PROMPT;
  form.append("prompt", prompt);
  form.append("image[]", asBlob(prepared.target), "target.png");
  if (mode === "try-hairstyle") {
    if (!prepared.reference) throw new Error("Reference image is required");
    form.append("image[]", asBlob(prepared.reference), "reference.png");
  }
  form.append("mask", asBlob(prepared.mask), "hair-mask.png");
  form.append("size", "1024x1024");
  if (model.startsWith("gpt-image-2.5") || model === "gpt-image-2") form.append("quality", "medium");
  form.append("response_format", "b64_json");
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(100_000),
  });
  const requestId = response.headers.get("avalai-request-id") || response.headers.get("x-request-id");
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    await recordCost(model, requestId, apiKey);
    throw new Error(`AvalAI ${model} edit failed (${response.status}): ${detail}`);
  }
  const data = await response.json();
  const actualCost = await recordCost(model, requestId, apiKey, data?.estimated_cost?.unit);
  const image = data?.data?.[0];
  let imageBase64: string;
  if (typeof image?.b64_json === "string") imageBase64 = image.b64_json;
  else if (typeof image?.url === "string" && image.url.startsWith("https://")) {
    const imageResponse = await fetch(image.url, { signal: AbortSignal.timeout(20_000) });
    if (!imageResponse.ok || !imageResponse.headers.get("content-type")?.startsWith("image/")) {
      throw new Error("AvalAI returned an invalid image URL");
    }
    imageBase64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
  } else throw new Error("AvalAI returned no image");
  return { image: imageBase64, costUsd: actualCost };
}

export async function generateOptimizedHairEdit(args: {
  mode: HairEditMode;
  userImage: Buffer;
  referenceImage?: Buffer;
  model?: string;
}): Promise<HairEditResult & { model: string; costUsd?: number }> {
  const models = await getAvalaiEditModels();
  const ids = models.map((model) => model.id);
  if (!ids.length) throw new Error("No supported AvalAI editing model is available for this account");
  const model = args.model && args.model !== "auto"
    ? args.model : ids.find(isAutoAvalaiEditModel);
  if (!model || !ids.includes(model)) throw new Error("Selected model is not available for AvalAI image editing");
  const original = args.userImage.toString("base64");
  const prepared = await runImageProcessor<PreparedImage>({
    action: "prepare", userImage: original, referenceImage: args.referenceImage?.toString("base64"),
  });
  const generated = await edit(model, args.mode, prepared);
  const composed = await runImageProcessor<{ imageUrl: string }>({
    action: "compose", userImage: original, generatedImage: generated.image,
    allowed: prepared.allowed, box: prepared.box, contentBox: prepared.contentBox,
  });
  return { imageUrl: composed.imageUrl, model, costUsd: generated.costUsd };
}

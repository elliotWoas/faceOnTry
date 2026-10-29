import { HairEditMode, HairEditResult, ModelOption } from "@/lib/image-providers/types";
import { MODE_1_BASE_PROMPT, MODE_2_BASE_PROMPT } from "@/lib/image-providers/prompts";
import { PreparedImage, runImageProcessor } from "./python";

const DEFAULT_PRIORITY = ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "flux.2-pro", "gpt-image-2", "gpt-image-1.5"];
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
  const available = new Map((await availableModels()).map((model) => [model.id, model]));
  return priority().filter((id) => available.get(id)?.supported_endpoints?.includes("/v1/images/edits")).map((id) => ({
    id,
    name: `${id} (AvalAI)`,
    provider: "avalai" as const,
    description: "AvalAI model with image editing endpoint",
    isConfigured: true,
    costEstimate: "See AvalAI pricing",
  }));
}

function asBlob(base64: string) {
  return new Blob([Uint8Array.from(Buffer.from(base64, "base64"))], { type: "image/png" });
}

async function edit(model: string, mode: HairEditMode, prepared: PreparedImage): Promise<string> {
  const { apiKey, baseUrl } = config();
  const form = new FormData();
  form.append("model", model);
  const prompt = mode === "try-hairstyle"
    ? `Image 1 is the target person. Image 2 is the hairstyle reference. The mask applies only to Image 1.\n\n${MODE_1_BASE_PROMPT}`
    : MODE_2_BASE_PROMPT;
  form.append("prompt", prompt);
  form.append("image[]", asBlob(prepared.target), "target.png");
  if (mode === "try-hairstyle") {
    if (!prepared.reference) throw new Error("Reference image is required");
    form.append("image[]", asBlob(prepared.reference), "reference.png");
  }
  form.append("mask", asBlob(prepared.mask), "hair-mask.png");
  form.append("size", "1024x1024");
  if (model.startsWith("gpt-image-2.5")) form.append("quality", "high");
  form.append("response_format", "b64_json");
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(100_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`AvalAI ${model} edit failed (${response.status}): ${detail}`);
  }
  const data = await response.json();
  const image = data?.data?.[0];
  if (typeof image?.b64_json === "string") return image.b64_json;
  if (typeof image?.url === "string" && image.url.startsWith("https://")) {
    const imageResponse = await fetch(image.url, { signal: AbortSignal.timeout(20_000) });
    if (!imageResponse.ok || !imageResponse.headers.get("content-type")?.startsWith("image/")) {
      throw new Error("AvalAI returned an invalid image URL");
    }
    return Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
  }
  throw new Error("AvalAI returned no image");
}

export async function generateOptimizedHairEdit(args: {
  mode: HairEditMode;
  userImage: Buffer;
  referenceImage?: Buffer;
  model?: string;
}): Promise<HairEditResult & { model: string }> {
  const models = await getAvalaiEditModels();
  const ids = models.map((model) => model.id);
  if (!ids.length) throw new Error("No supported AvalAI editing model is available for this account");
  const candidates = args.model && args.model !== "auto" ? [args.model] : ids;
  if (candidates.some((id) => !ids.includes(id))) throw new Error("Selected model is not available for AvalAI image editing");
  const original = args.userImage.toString("base64");
  const prepared = await runImageProcessor<PreparedImage>({
    action: "prepare", userImage: original, referenceImage: args.referenceImage?.toString("base64"),
  });
  let lastError: Error | undefined;
  for (const model of candidates) {
    let generatedImage: string;
    try {
      generatedImage = await edit(model, args.mode, prepared);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`AvalAI edit attempt failed for ${model}:`, lastError.message);
      if (!/edit failed \((400|404|422|500|502|503|504)\)/.test(lastError.message)) throw lastError;
      continue;
    }
    const composed = await runImageProcessor<{ imageUrl: string }>({
      action: "compose", userImage: original, generatedImage,
      allowed: prepared.allowed, box: prepared.box, contentBox: prepared.contentBox,
    });
    return { imageUrl: composed.imageUrl, model };
  }
  throw lastError || new Error("AvalAI image editing failed");
}

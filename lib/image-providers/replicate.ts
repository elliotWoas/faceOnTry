import { HairEditRequest, HairEditResult } from "./types";
import { MODE_1_BASE_PROMPT, MODE_2_BASE_PROMPT } from "./prompts";

export async function generateReplicateHairEdit(
  request: HairEditRequest
): Promise<HairEditResult> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured in environment variables");
  }

  const isMode1 = request.mode === "try-hairstyle";
  const userBase64Uri = `data:${request.userImageMime};base64,${request.userImage.toString(
    "base64"
  )}`;

  let refBase64Uri: string | undefined;
  if (isMode1) {
    if (!request.referenceImage) {
      throw new Error("Missing reference image for Try a hairstyle mode");
    }
    const refMime = request.referenceImageMime || "image/jpeg";
    refBase64Uri = `data:${refMime};base64,${request.referenceImage.toString("base64")}`;
  }

  // Model resolution
  const rawModel =
    request.model ||
    process.env.REPLICATE_IMAGE_MODEL ||
    "black-forest-labs/flux-kontext-pro";

  // Replicate model path: either "owner/model" or with version "owner/model:version"
  const modelPath = rawModel.includes("/") ? rawModel : `black-forest-labs/${rawModel}`;

  const prompt = isMode1 ? MODE_1_BASE_PROMPT : MODE_2_BASE_PROMPT;

  // Build model inputs
  const input: Record<string, unknown> = {
    prompt,
    image: userBase64Uri,
    input_image: userBase64Uri,
  };

  if (isMode1 && refBase64Uri) {
    input.reference_image = refBase64Uri;
    input.image_reference = refBase64Uri;
    input.image2 = refBase64Uri;
  }

  // Create prediction
  const isVersion = modelPath.includes(":");
  const createUrl = isVersion
    ? "https://api.replicate.com/v1/predictions"
    : `https://api.replicate.com/v1/models/${modelPath}/predictions`;

  const createBody = isVersion
    ? {
        version: modelPath.split(":")[1],
        input,
      }
    : { input };

  const startRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60", // Replicate wait header for fast synchronous response
    },
    body: JSON.stringify(createBody),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error("Replicate create error:", startRes.status, errText);
    if (startRes.status === 401) {
      throw new Error("Invalid or unauthorized Replicate API token.");
    }
    if (startRes.status === 404) {
      throw new Error(`Replicate model '${modelPath}' not found or inaccessible.`);
    }
    if (startRes.status === 429) {
      throw new Error("Replicate rate limit exceeded. Please wait a moment.");
    }
    throw new Error("Generation failed with Replicate provider.");
  }

  let prediction = await startRes.json();

  // Poll if not completed yet
  const startTime = Date.now();
  const timeoutMs = 120000; // 2 minutes timeout

  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Hairstyle generation timed out on Replicate.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!pollRes.ok) {
      console.error("Replicate poll error:", pollRes.status);
      throw new Error("Failed while waiting for Replicate prediction.");
    }

    prediction = await pollRes.json();
  }

  if (prediction.status === "failed" || prediction.status === "canceled") {
    console.error("Replicate prediction failed:", prediction.error);
    throw new Error(prediction.error || "Replicate image generation failed.");
  }

  // Extract output image URL
  let imageUrl: string | undefined;
  if (typeof prediction.output === "string") {
    imageUrl = prediction.output;
  } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
    imageUrl = prediction.output[prediction.output.length - 1];
  }

  if (!imageUrl) {
    throw new Error("Replicate completed but did not produce an image output.");
  }

  let hairstyleName: string | undefined;
  let explanation: string | undefined;

  if (!isMode1) {
    hairstyleName = "Custom Tailored Style";
    explanation =
      "Harmonized with your face shape, forehead proportions, and natural hairline.";
  }

  return {
    imageUrl,
    hairstyleName,
    explanation,
  };
}

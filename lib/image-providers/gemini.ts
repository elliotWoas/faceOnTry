import { HairEditRequest, HairEditResult } from "./types";
import { MODE_1_BASE_PROMPT, MODE_2_BASE_PROMPT } from "./prompts";

export async function generateGeminiHairEdit(
  request: HairEditRequest
): Promise<HairEditResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables");
  }

  const model =
    request.model ||
    process.env.GEMINI_IMAGE_MODEL ||
    "gemini-3.1-flash-lite-image";

  const userBase64 = request.userImage.toString("base64");
  const isMode1 = request.mode === "try-hairstyle";

  const promptText = isMode1 ? MODE_1_BASE_PROMPT : MODE_2_BASE_PROMPT;

  const parts: Array<Record<string, unknown>> = [
    { text: promptText },
    {
      inlineData: {
        mimeType: request.userImageMime,
        data: userBase64,
      },
    },
  ];

  if (isMode1) {
    if (!request.referenceImage) {
      throw new Error("Missing reference image for Try a hairstyle mode");
    }
    const refBase64 = request.referenceImage.toString("base64");
    parts.push({
      inlineData: {
        mimeType: request.referenceImageMime || "image/jpeg",
        data: refBase64,
      },
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const payload = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.4,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Gemini API error status:", response.status, errBody);

    // Provide friendly error message
    if (response.status === 404) {
      throw new Error(
        `Gemini model '${model}' was not found or is not available with your API key.`
      );
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error("Invalid or unauthorized Gemini API key.");
    }
    if (response.status === 429) {
      throw new Error("Gemini API rate limit reached. Please wait a moment.");
    }
    throw new Error("Generation failed with Gemini provider.");
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini did not return any candidate response.");
  }

  const responseParts = candidate.content?.parts || [];
  let imageUrl: string | undefined;
  let textOutput = "";

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType || "image/png";
      imageUrl = `data:${mime};base64,${part.inlineData.data}`;
    } else if (part.text) {
      textOutput += part.text + "\n";
    }
  }

  if (!imageUrl) {
    console.error("Gemini response missing inline image:", JSON.stringify(data));
    throw new Error(
      "Gemini returned text without an edited image. The model might not support direct image editing."
    );
  }

  // Parse hairstyle name and reason if in Mode 2
  let hairstyleName: string | undefined;
  let explanation: string | undefined;

  if (!isMode1 && textOutput) {
    const hairMatch = textOutput.match(/Recommended hairstyle:\s*(.+?)(?:\n|$)/i);
    const reasonMatch = textOutput.match(/Reason:\s*([\s\S]+?)(?:\n|$)/i);

    if (hairMatch) hairstyleName = hairMatch[1].trim();
    if (reasonMatch) explanation = reasonMatch[1].trim();

    if (!hairstyleName && textOutput.trim().length > 0) {
      // Fallback extraction
      explanation = textOutput.trim();
    }
  }

  return {
    imageUrl,
    hairstyleName,
    explanation,
  };
}

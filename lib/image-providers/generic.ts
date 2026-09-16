import { HairEditRequest, HairEditResult } from "./types";
import { MODE_1_BASE_PROMPT, MODE_2_BASE_PROMPT } from "./prompts";

export interface GenericProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
}

export async function generateGenericHairEdit(
  request: HairEditRequest,
  config: GenericProviderConfig
): Promise<HairEditResult> {
  const { name, apiKey, baseUrl, modelId } = config;

  if (!apiKey) {
    throw new Error(`${name} API key is not configured in environment variables`);
  }

  if (!baseUrl) {
    throw new Error(`${name} base URL is not configured`);
  }

  const model = request.model || modelId;
  if (!model) {
    throw new Error(`No image model specified for ${name}`);
  }

  const isMode1 = request.mode === "try-hairstyle";
  const prompt = isMode1 ? MODE_1_BASE_PROMPT : MODE_2_BASE_PROMPT;

  // Clean base URL (remove trailing slash)
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  const userBase64 = request.userImage.toString("base64");
  const userUri = `data:${request.userImageMime};base64,${userBase64}`;
  const editEndpoint = `${normalizedBase}/images/edits`;

  // Try JSON-based images/edits (standard for AvalAI / modern proxies)
  try {
    const jsonBody: Record<string, unknown> = {
      model,
      prompt,
      image: userUri,
    };
    if (isMode1 && request.referenceImage) {
      const refMime = request.referenceImageMime || "image/jpeg";
      const refData = `data:${refMime};base64,${request.referenceImage.toString("base64")}`;
      jsonBody.mask = refData;
      jsonBody.reference_image = refData;
    }

    const jsonRes = await fetch(editEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonBody),
    });

    if (jsonRes.ok) {
      const data = await jsonRes.json();
      const first = data?.data?.[0];
      let imageUrl: string | undefined;

      if (first?.b64_json) {
        imageUrl = `data:image/png;base64,${first.b64_json}`;
      } else if (first?.url) {
        imageUrl = first.url;
      }

      if (imageUrl) {
        return {
          imageUrl,
          hairstyleName: isMode1 ? undefined : "Recommended Hairstyle",
          explanation: isMode1
            ? undefined
            : "Aesthetically tailored to flatter your facial contours, hairline, and hair texture.",
        };
      }
    } else {
      const errTxt = await jsonRes.text();
      try {
        const errJson = JSON.parse(errTxt);
        if (errJson?.error?.message) {
          if (
            jsonRes.status === 429 ||
            errTxt.includes("insufficient") ||
            errTxt.includes("credit") ||
            errTxt.includes("restricted")
          ) {
            throw new Error(`${name}: ${errJson.error.message}`);
          }
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith(`${name}:`)) {
          throw parseErr;
        }
      }
    }
  } catch (jsonErr: unknown) {
    if (jsonErr instanceof Error && jsonErr.message.startsWith(`${name}:`)) {
      throw jsonErr;
    }
    console.warn(`${name} JSON /images/edits failed:`, jsonErr);
  }

  // If model is a generation model or in recommendation mode, try /images/generations
  const genEndpoint = `${normalizedBase}/images/generations`;
  try {
    const genRes = await fetch(genEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
      }),
    });

    if (genRes.ok) {
      const data = await genRes.json();
      const first = data?.data?.[0];
      let imageUrl: string | undefined;

      if (first?.b64_json) {
        imageUrl = `data:image/png;base64,${first.b64_json}`;
      } else if (first?.url) {
        imageUrl = first.url;
      }

      if (imageUrl) {
        return {
          imageUrl,
          hairstyleName: isMode1 ? undefined : "Recommended Hairstyle",
          explanation: isMode1
            ? undefined
            : "Aesthetically tailored to flatter your facial contours, hairline, and hair texture.",
        };
      }
    } else {
      const errTxt = await genRes.text();
      try {
        const errJson = JSON.parse(errTxt);
        if (
          genRes.status === 429 ||
          errTxt.includes("insufficient") ||
          errTxt.includes("credit") ||
          errTxt.includes("restricted")
        ) {
          throw new Error(`${name}: ${errJson.error?.message || errTxt}`);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith(`${name}:`)) {
          throw parseErr;
        }
      }
    }
  } catch (genErr: unknown) {
    if (genErr instanceof Error && genErr.message.startsWith(`${name}:`)) {
      throw genErr;
    }
    console.warn(`${name} /images/generations failed:`, genErr);
  }

  // Prepare FormData for standard multipart images/edits
  const formData = new FormData();
  const userBlob = new Blob([new Uint8Array(request.userImage)], {
    type: request.userImageMime,
  });
  formData.append("image", userBlob, "user-photo.png");
  formData.append("prompt", prompt);
  formData.append("model", model);
  formData.append("response_format", "b64_json");

  if (isMode1 && request.referenceImage) {
    const refBlob = new Blob([new Uint8Array(request.referenceImage)], {
      type: request.referenceImageMime || "image/jpeg",
    });
    formData.append("mask", refBlob, "reference-photo.png");
  }

  try {
    const res = await fetch(editEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const first = data?.data?.[0];
      let imageUrl: string | undefined;

      if (first?.b64_json) {
        imageUrl = `data:image/png;base64,${first.b64_json}`;
      } else if (first?.url) {
        imageUrl = first.url;
      }

      if (imageUrl) {
        return {
          imageUrl,
          hairstyleName: isMode1 ? undefined : "Recommended Style",
          explanation: isMode1
            ? undefined
            : "Chosen to complement your facial structure and hair profile.",
        };
      }
    }
  } catch (err) {
    console.warn(`${name} /images/edits failed, falling back to chat/completions:`, err);
  }

  // Fallback: try Chat Completions vision/multimodal endpoint
  const chatEndpoint = `${normalizedBase}/chat/completions`;
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: userUri },
        },
      ] as Array<Record<string, unknown>>,
    },
  ];

  if (isMode1 && request.referenceImage) {
    const refMime = request.referenceImageMime || "image/jpeg";
    const refUri = `data:${refMime};base64,${request.referenceImage.toString("base64")}`;
    messages[0].content.push({
      type: "image_url",
      image_url: { url: refUri },
    });
  }

  const chatRes = await fetch(chatEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      modalities: ["image", "text"],
    }),
  });

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    console.error(`${name} chat completion error:`, chatRes.status, errText);
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) {
        throw new Error(`${name}: ${errJson.error.message}`);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.startsWith(`${name}:`)) throw e;
    }
    throw new Error(`Generation failed with ${name} provider.`);
  }

  const chatData = await chatRes.json();
  const message = chatData?.choices?.[0]?.message;

  // Check if message content or image object contains an image
  let finalImageUrl: string | undefined;
  if (message?.image?.url) {
    finalImageUrl = message.image.url;
  } else if (typeof message?.content === "string") {
    // Check markdown image tag ![...](url or data:)
    const mdMatch = message.content.match(/!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+|https?:\/\/[^\)]+)\)/);
    if (mdMatch) {
      finalImageUrl = mdMatch[1];
    } else if (message.content.startsWith("http") || message.content.startsWith("data:image/")) {
      finalImageUrl = message.content.trim();
    }
  }

  if (!finalImageUrl) {
    throw new Error(
      `${name} responded without an image output. Please ensure the model supports image editing.`
    );
  }

  return {
    imageUrl: finalImageUrl,
    hairstyleName: isMode1 ? undefined : "Recommended Style",
    explanation: isMode1
      ? undefined
      : "Customized to naturally enhance your facial proportions.",
  };
}

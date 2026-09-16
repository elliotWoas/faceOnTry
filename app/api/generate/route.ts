import { NextRequest, NextResponse } from "next/server";
import { generateHairEdit, HairEditMode, ProviderId } from "@/lib/image-providers";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for AI image generation

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const mode = formData.get("mode") as HairEditMode | null;
    const model = formData.get("model") as string | null;
    const provider = formData.get("provider") as ProviderId | null;
    const userImageFile = formData.get("userImage") as File | null;
    const referenceImageFile = formData.get("referenceImage") as File | null;

    // Validate mode
    if (!mode || (mode !== "try-hairstyle" && mode !== "recommend-hairstyle")) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'try-hairstyle' or 'recommend-hairstyle'." },
        { status: 400 }
      );
    }

    // Validate user image presence
    if (!userImageFile || !(userImageFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing image. Please upload a selfie photo." },
        { status: 400 }
      );
    }

    // Validate user image size
    if (userImageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 10 MB." },
        { status: 400 }
      );
    }

    // Validate user image MIME type
    if (!ALLOWED_MIME_TYPES.has(userImageFile.type.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Invalid image format. Supported formats are JPG, JPEG, PNG, and WEBP.",
        },
        { status: 400 }
      );
    }

    // Validate reference image for Mode 1
    if (mode === "try-hairstyle") {
      if (!referenceImageFile || !(referenceImageFile instanceof File)) {
        return NextResponse.json(
          {
            error:
              "Missing reference image. Please upload a hairstyle reference photo.",
          },
          { status: 400 }
        );
      }

      if (referenceImageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error:
              "Reference file too large. Maximum allowed size is 10 MB.",
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(referenceImageFile.type.toLowerCase())) {
        return NextResponse.json(
          {
            error:
              "Invalid reference image format. Supported formats are JPG, JPEG, PNG, and WEBP.",
          },
          { status: 400 }
        );
      }
    }

    // Convert Files to Buffers (in-memory processing, no permanent disk storage)
    const userImageBuffer = Buffer.from(await userImageFile.arrayBuffer());
    let referenceImageBuffer: Buffer | undefined;

    if (referenceImageFile && referenceImageFile instanceof File) {
      referenceImageBuffer = Buffer.from(await referenceImageFile.arrayBuffer());
    }

    // Generate edit
    const result = await generateHairEdit({
      mode,
      userImage: userImageBuffer,
      userImageMime: userImageFile.type,
      referenceImage: referenceImageBuffer,
      referenceImageMime: referenceImageFile?.type,
      provider: provider || undefined,
      model: model || undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Generation failed. Please try again.";
    console.error("API /api/generate error:", err);

    // Map errors to clean user messages
    let clientError = "Generation failed";
    let status = 500;

    if (errorMsg.includes("not configured")) {
      clientError = errorMsg;
      status = 400;
    } else if (errorMsg.includes("not found") || errorMsg.includes("inaccessible")) {
      clientError = "Model unavailable";
      status = 404;
    } else if (errorMsg.includes("rate limit")) {
      clientError = "Provider rate limit reached. Please wait a moment.";
      status = 429;
    } else if (errorMsg.includes("timed out")) {
      clientError = "Generation timed out. Please try again.";
      status = 504;
    } else if (errorMsg.includes("Missing")) {
      clientError = errorMsg;
      status = 400;
    } else {
      clientError = errorMsg;
    }

    return NextResponse.json({ error: clientError }, { status });
  }
}

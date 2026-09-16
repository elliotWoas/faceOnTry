import { NextResponse } from "next/server";
import { getSupportedModels, getProviderStatus } from "@/lib/image-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = getSupportedModels();
    const providers = getProviderStatus();

    return NextResponse.json({
      models,
      providers,
    });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider status" },
      { status: 500 }
    );
  }
}

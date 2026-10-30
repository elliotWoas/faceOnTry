import { NextResponse } from "next/server";
import { getSupportedModels, getProviderStatus } from "@/lib/image-providers";
import { getAvalaiEditModels, isAutoAvalaiEditModel } from "@/lib/hair-pipeline/avalai";
import { ModelOption } from "@/lib/image-providers/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let avalaiModels: ModelOption[] = [];
    try {
      avalaiModels = await getAvalaiEditModels();
    } catch (error) {
      console.warn("AvalAI model discovery unavailable:", error);
    }
    const models = [
      ...(avalaiModels.some((model) => isAutoAvalaiEditModel(model.id)) ? [{ id: "auto", name: "Auto (AvalAI image edit)",
        provider: "avalai" as const, description: "Select the highest-priority documented GPT edit model",
        isConfigured: true, costEstimate: "Varies by model" }] : []),
      ...avalaiModels,
      ...getSupportedModels().filter((model) => model.provider !== "avalai"),
    ];
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

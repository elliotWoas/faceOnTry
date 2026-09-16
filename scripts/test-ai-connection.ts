import fs from "fs";
import path from "path";
import {
  checkCostGuardrail,
  MAX_ALLOWED_COST_USD,
  COST_WARNING_THRESHOLD_USD,
  MODEL_PRICING_TABLE,
} from "../lib/image-providers/cost-guardrail";

// Ensure .env.local is loaded
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch (e) {
  // Ignore env read error
}

const AVALAI_KEY = process.env.AVALAI_API_KEY;
const AVALAI_BASE_URL = (process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1").replace(/\/+$/, "");

// 1x1 transparent PNG for lightweight edit tests
const SAMPLE_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

interface TargetModelSpec {
  id: string;
  type: "edit" | "generation";
  description: string;
}

const TARGET_MODELS: TargetModelSpec[] = [
  {
    id: "qwen-image-edit-plus",
    type: "edit",
    description: "Qwen Image Edit Plus • High-accuracy hair/face image transfer",
  },
  {
    id: "qwen-image-plus",
    type: "generation",
    description: "Qwen Image Plus • Photorealistic style generation",
  },
  {
    id: "cf.flux-2-klein-4b",
    type: "generation",
    description: "FLUX 2 Klein 4B • Ultra-low-cost, rapid generation",
  },
  {
    id: "gpt-image-1-mini",
    type: "generation",
    description: "GPT Image 1 Mini • Lightweight budget portrait model",
  },
  {
    id: "gpt-image-1.5",
    type: "generation",
    description: "GPT Image 1.5 • High-tier model (Expected to exceed budget)",
  },
  {
    id: "seedream-4-5-251128",
    type: "generation",
    description: "SeeDream 4.5 • ByteDance high-fidelity portrait generator",
  },
];

interface TestResult {
  requestedModel: string;
  testedModel: string;
  type: "edit" | "generation";
  estimatedCost: number;
  guardrailStatus: "APPROVED" | "BLOCKED & FELL BACK";
  httpStatus: number | string;
  statusText: string;
  success: boolean;
  imageUrl?: string;
  details: string;
}

async function testSingleModel(spec: TargetModelSpec): Promise<TestResult> {
  // 1. Enforce Cost Guardrail
  const guardrail = checkCostGuardrail(spec.id);

  let modelToCall = spec.id;
  let guardrailStatus: "APPROVED" | "BLOCKED & FELL BACK" = "APPROVED";

  if (guardrail.fellBack) {
    guardrailStatus = "BLOCKED & FELL BACK";
    modelToCall = guardrail.effectiveModel;
    console.log(
      `   🛑 [GUARDRAIL TRIGGERED] '${spec.id}' exceeded budget threshold ($${COST_WARNING_THRESHOLD_USD.toFixed(
        2
      )}/img). Blocked call to '${spec.id}' and falling back to '${modelToCall}' ($${guardrail.estimatedCost.toFixed(
        3
      )}/img).`
    );
  } else {
    console.log(
      `   🛡️ [GUARDRAIL PASS] '${spec.id}' estimated at ~$${guardrail.estimatedCost.toFixed(
        3
      )}/img (Within $${MAX_ALLOWED_COST_USD.toFixed(2)} budget cap).`
    );
  }

  // Determine endpoint based on model category
  const isEdit = spec.type === "edit";
  const endpoint = isEdit
    ? `${AVALAI_BASE_URL}/images/edits`
    : `${AVALAI_BASE_URL}/images/generations`;

  const payload = isEdit
    ? {
        model: modelToCall,
        image: `data:image/png;base64,${SAMPLE_IMAGE_BASE64}`,
        prompt: "Apply a clean textured low fade haircut, photorealistic portrait",
      }
    : {
        model: modelToCall,
        prompt: "A photorealistic portrait of a modern stylish haircut",
      };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AVALAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    if (res.ok) {
      const imgUrl =
        data?.data?.[0]?.url ||
        (data?.data?.[0]?.b64_json ? "[Base64 Image Data Received]" : undefined);

      return {
        requestedModel: spec.id,
        testedModel: modelToCall,
        type: spec.type,
        estimatedCost: guardrail.estimatedCost,
        guardrailStatus,
        httpStatus: res.status,
        statusText: res.statusText,
        success: true,
        imageUrl: imgUrl,
        details: "Active & generated valid image",
      };
    } else {
      let details = data?.error?.message || responseText.slice(0, 150);
      if (res.status === 429 && details.includes("insufficient credit")) {
        details = "Insufficient account credit (Requires balance top-up)";
      } else if (res.status === 403 && details.includes("restricted")) {
        details = "Model restricted on current account tier";
      }

      return {
        requestedModel: spec.id,
        testedModel: modelToCall,
        type: spec.type,
        estimatedCost: guardrail.estimatedCost,
        guardrailStatus,
        httpStatus: res.status,
        statusText: res.statusText,
        success: false,
        details,
      };
    }
  } catch (err: any) {
    return {
      requestedModel: spec.id,
      testedModel: modelToCall,
      type: spec.type,
      estimatedCost: guardrail.estimatedCost,
      guardrailStatus,
      httpStatus: "ERR",
      statusText: "Network Error",
      success: false,
      details: err.message || "Connection failed",
    };
  }
}

async function run() {
  console.log("================================================================================");
  console.log("             AVALAI AI IMAGE MODELS & BUDGET GUARDRAIL TEST                     ");
  console.log("================================================================================");
  console.log(`• Base URL:            ${AVALAI_BASE_URL}`);
  console.log(`• API Key Configured:  ${AVALAI_KEY ? "Yes (" + AVALAI_KEY.slice(0, 8) + "...)" : "NO ❌"}`);
  console.log(`• Hard Budget Cap:     $${MAX_ALLOWED_COST_USD.toFixed(2)} per image`);
  console.log(`• Fallback Threshold:  $${COST_WARNING_THRESHOLD_USD.toFixed(2)} per image`);
  console.log("--------------------------------------------------------------------------------\n");

  if (!AVALAI_KEY) {
    console.error("❌ AVALAI_API_KEY is not defined in .env.local!");
    process.exit(1);
  }

  const results: TestResult[] = [];

  for (let i = 0; i < TARGET_MODELS.length; i++) {
    const spec = TARGET_MODELS[i];
    console.log(`[${i + 1}/${TARGET_MODELS.length}] Testing: ${spec.id} (${spec.type})`);
    const result = await testSingleModel(spec);
    results.push(result);
    console.log(
      `   ➜ Result: HTTP ${result.httpStatus} - ${
        result.success ? "✅ SUCCESS" : "⚠️ " + result.details
      }`
    );
    if (result.imageUrl) {
      console.log(`   🖼️ Image Output: ${result.imageUrl}`);
    }
    console.log();
  }

  // Final Terminal Report
  console.log("================================================================================");
  console.log("                               FINAL SUMMARY REPORT                             ");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      "Requested Model": r.requestedModel,
      "Effective Model": r.testedModel,
      "Cost Est.": `$${r.estimatedCost.toFixed(3)}`,
      Guardrail: r.guardrailStatus,
      HTTP: r.httpStatus,
      Status: r.success ? "✅ ACTIVE" : "⚠️ FAILED",
      "Summary / Note": r.details,
    }))
  );

  const fallbackCount = results.filter((r) => r.guardrailStatus.includes("FELL BACK")).length;
  console.log("--------------------------------------------------------------------------------");
  console.log(`• Total Models Tested: ${results.length}`);
  console.log(`• Cost Guardrail Interventions (Blocked > $0.04): ${fallbackCount}`);
  console.log("================================================================================\n");
}

run();

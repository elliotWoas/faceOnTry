import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const AVALAI_KEY = process.env.AVALAI_API_KEY;
const AVALAI_URL = (process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1").replace(/\/+$/, "");
const NINE_ROUTER_KEY = process.env.NINE_ROUTER_API_KEY;
const NINE_ROUTER_URL = (process.env.NINE_ROUTER_BASE_URL || "https://api.9router.com/v1").replace(/\/+$/, "");

console.log("==================================================");
console.log("        IMAGE GENERATION CAPABILITY TEST         ");
console.log("==================================================\n");

async function testGeminiImage() {
  console.log("--- 1. Testing Google Gemini (Image Generation) ---");
  console.log("Key prefix:", GEMINI_KEY?.slice(0, 10));

  // Test Imagen 3 on Gemini API
  const endpoints = [
    {
      name: "Imagen 3 (imagen-3.0-generate-002:predict)",
      url: "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict",
      body: {
        instances: [{ prompt: "A stylish modern hairstyle for a man, photorealistic, 4k" }],
        parameters: { sampleCount: 1, aspectRatio: "1:1" }
      }
    },
    {
      name: "Gemini 2.0 Flash Exp (generateContent with responseModalities: IMAGE)",
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
      body: {
        contents: [{ parts: [{ text: "Generate an image of a stylish modern low taper fade haircut." }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
      }
    }
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting ${ep.name}...`);
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify(ep.body)
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        console.log(`✅ SUCCESS with ${ep.name}!`);
        // Check if image data received
        if (text.includes("bytesBase64Encoded") || text.includes("inlineData")) {
          console.log("🖼️ Image data received successfully in base64!");
        } else {
          console.log("Output preview:", text.slice(0, 200));
        }
        return ep.name;
      } else {
        console.log(`❌ Failed:`, text.slice(0, 300));
      }
    } catch (e) {
      console.log(`❌ Network/Fetch error:`, e.message);
    }
  }
}

async function testAvalAIImage() {
  console.log("\n--- 2. Testing AvalAI.ir (Image Generation) ---");
  console.log("Base URL:", AVALAI_URL);

  // Check models first to find available image models
  let availableImageModels = [];
  try {
    const mRes = await fetch(`${AVALAI_URL}/models`, {
      headers: { Authorization: `Bearer ${AVALAI_KEY}` }
    });
    if (mRes.ok) {
      const mData = await mRes.json();
      const all = (mData.data || []).map(m => m.id);
      availableImageModels = all.filter(id => id.includes("dall") || id.includes("flux") || id.includes("midjourney") || id.includes("image"));
      console.log("Found Image Models on AvalAI:", availableImageModels.slice(0, 10));
    }
  } catch (e) {
    console.log("Could not list models:", e.message);
  }

  const candidateModels = availableImageModels.length > 0 ? availableImageModels : ["dall-e-3", "dall-e-2", "flux-pro"];

  for (const model of candidateModels.slice(0, 3)) {
    console.log(`\nTesting AvalAI /images/generations with model: ${model}...`);
    try {
      const res = await fetch(`${AVALAI_URL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AVALAI_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt: "A stylish modern low taper fade hairstyle, photorealistic portrait",
          n: 1,
          size: "1024x1024"
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        console.log(`✅ SUCCESS with AvalAI model: ${model}!`);
        const json = JSON.parse(text);
        const imgUrl = json?.data?.[0]?.url || json?.data?.[0]?.b64_json?.slice(0, 50);
        console.log("🖼️ Image result:", imgUrl?.slice(0, 80));
        return model;
      } else {
        console.log(`❌ Failed with ${model}:`, text.slice(0, 300));
      }
    } catch (e) {
      console.log(`❌ Error:`, e.message);
    }
  }
}

async function testNineRouterImage() {
  console.log("\n--- 3. Testing 9Router (Image Generation) ---");
  console.log("Base URL:", NINE_ROUTER_URL);

  let availableImageModels = [];
  try {
    const mRes = await fetch(`${NINE_ROUTER_URL}/models`, {
      headers: { Authorization: `Bearer ${NINE_ROUTER_KEY}` }
    });
    if (mRes.ok) {
      const mData = await mRes.json();
      const all = (mData.data || []).map(m => m.id);
      availableImageModels = all.filter(id => id.includes("dall") || id.includes("flux") || id.includes("image") || id.includes("seed"));
      console.log("Found Image Models on 9Router:", availableImageModels.slice(0, 10));
    }
  } catch (e) {
    console.log("Could not list models:", e.message);
  }

  const candidateModels = availableImageModels.length > 0 ? availableImageModels : ["dall-e-3", "black-forest-labs/flux-schnell", "flux-pro"];

  for (const model of candidateModels.slice(0, 3)) {
    console.log(`\nTesting 9Router /images/generations with model: ${model}...`);
    try {
      const res = await fetch(`${NINE_ROUTER_URL}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NINE_ROUTER_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt: "A stylish modern low taper fade hairstyle, photorealistic portrait",
          n: 1,
          size: "1024x1024"
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        console.log(`✅ SUCCESS with 9Router model: ${model}!`);
        const json = JSON.parse(text);
        const imgUrl = json?.data?.[0]?.url || json?.data?.[0]?.b64_json?.slice(0, 50);
        console.log("🖼️ Image result:", imgUrl?.slice(0, 80));
        return model;
      } else {
        console.log(`❌ Failed with ${model}:`, text.slice(0, 300));
      }
    } catch (e) {
      console.log(`❌ Error:`, e.message);
    }
  }
}

async function main() {
  await testGeminiImage();
  await testAvalAIImage();
  await testNineRouterImage();
  console.log("\n==================================================");
  console.log("                ALL TESTS FINISHED                ");
  console.log("==================================================");
}

main();

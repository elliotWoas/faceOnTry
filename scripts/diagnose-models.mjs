import fs from "fs";
import path from "path";

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
const NINE_ROUTER_KEY = process.env.NINE_ROUTER_API_KEY;

async function checkGemini() {
  console.log("\n🔍 Checking Gemini Models for this key...");
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": GEMINI_KEY }
    });
    const data = await res.json();
    const models = (data.models || []).map(m => ({
      name: m.name.replace("models/", ""),
      methods: m.supportedGenerationMethods
    }));
    console.log("Total Gemini models:", models.length);
    const imageCapable = models.filter(m => 
      m.name.includes("image") || 
      m.name.includes("imagen") || 
      m.methods?.includes("generateImages") || 
      m.methods?.includes("predict")
    );
    console.log("Image/Imagen capable models in Gemini:", imageCapable);
    console.log("Sample generateContent models:", models.filter(m => m.methods?.includes("generateContent")).slice(0, 10).map(m => m.name));
  } catch (e) {
    console.error("Gemini check error:", e.message);
  }
}

async function checkAvalAI() {
  console.log("\n🔍 Checking AvalAI available image models...");
  try {
    const mRes = await fetch("https://api.avalai.ir/v1/models", {
      headers: { Authorization: `Bearer ${AVALAI_KEY}` }
    });
    const mData = await mRes.json();
    const allModels = (mData.data || []).map(m => m.id);
    console.log("Total models on AvalAI:", allModels.length);

    const imageModels = allModels.filter(m => 
      m.includes("image") || m.includes("flux") || m.includes("dall") || m.includes("midjourney") || m.includes("stable")
    );
    console.log("All image models on AvalAI:", imageModels);

    // Test each to find which one this account can use:
    for (const m of imageModels) {
      const testRes = await fetch("https://api.avalai.ir/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AVALAI_KEY}`,
        },
        body: JSON.stringify({
          model: m,
          prompt: "A modern short haircut portrait",
          n: 1,
          size: "1024x1024"
        })
      });
      const txt = await testRes.text();
      if (testRes.ok) {
        console.log(`🎉 Model ${m} is ACTIVE and generated an image!`);
        break;
      } else {
        const isRestricted = txt.includes("restricted") || txt.includes("tier");
        console.log(`- ${m}: HTTP ${testRes.status} (${isRestricted ? "Tier restricted" : txt.slice(0, 80)})`);
      }
    }
  } catch (e) {
    console.error("AvalAI check error:", e.message);
  }
}

async function checkNineRouter() {
  console.log("\n🔍 Checking 9Router...");
  try {
    const mRes = await fetch("https://api.9router.com/v1/models", {
      headers: { Authorization: `Bearer ${NINE_ROUTER_KEY}` }
    });
    console.log("9Router /v1/models status:", mRes.status);
    if (mRes.ok) {
      const mData = await mRes.json();
      const all = (mData.data || []).map(m => m.id);
      console.log("Total models on 9Router:", all.length);
      const imageModels = all.filter(m => 
        m.includes("image") || m.includes("flux") || m.includes("dall") || m.includes("seed") || m.includes("gemini")
      );
      console.log("9Router image-related models:", imageModels);
    } else {
      console.log("9Router models response:", (await mRes.text()).slice(0, 200));
    }
  } catch (e) {
    console.error("9Router check error:", e.message);
  }
}

async function run() {
  await checkGemini();
  await checkAvalAI();
  await checkNineRouter();
}
run();

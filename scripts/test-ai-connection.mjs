import fs from "fs";
import path from "path";

// Load .env.local manually if not in process.env
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim();
        process.env[key.trim()] = val;
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env.local:", e);
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const AVALAI_KEY = process.env.AVALAI_API_KEY;
const AVALAI_URL = process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1";
const NINE_ROUTER_KEY = process.env.NINE_ROUTER_API_KEY;
const NINE_ROUTER_URL = process.env.NINE_ROUTER_BASE_URL || "https://api.9router.com/v1";

console.log("==========================================");
console.log("       AI PROVIDER CONNECTION TEST        ");
console.log("==========================================\n");

async function testGemini() {
  console.log("------------------------------------------");
  console.log("1. Testing Google Gemini API...");
  console.log("   Header: x-goog-api-key: " + (GEMINI_KEY ? GEMINI_KEY.slice(0, 8) + "..." : "MISSING"));

  if (!GEMINI_KEY) {
    console.log("❌ GEMINI_KEY is not defined.");
    return;
  }

  // 1. Test listing available models
  try {
    const listRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      method: "GET",
      headers: {
        "x-goog-api-key": GEMINI_KEY,
      },
    });

    console.log(`   Model List HTTP Status: ${listRes.status} ${listRes.statusText}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const modelNames = (listData.models || [])
        .map((m) => m.name.replace("models/", ""))
        .filter((n) => n.includes("flash") || n.includes("image") || n.includes("gemini"));
      console.log("   ✅ Available Gemini Models Sample:", modelNames.slice(0, 6).join(", "));
    } else {
      const errText = await listRes.text();
      console.log("   ⚠️ Model list error body:", errText);
    }
  } catch (err) {
    console.log("   ❌ Error listing Gemini models:", err.message);
  }

  // 2. Test generateContent call with x-goog-api-key header
  const testModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash-image"];
  for (const model of testModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello, confirm you are working." }] }],
          }),
        }
      );

      console.log(`   generateContent [${model}] HTTP Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log(`   ✅ Success with ${model}! Response: "${reply?.slice(0, 60)}..."`);
        break; // Working model confirmed!
      } else {
        const errText = await res.text();
        console.log(`   ⚠️ Model ${model} response:`, errText);
      }
    } catch (err) {
      console.log(`   ❌ Failed with ${model}:`, err.message);
    }
  }
}

async function testAvalAI() {
  console.log("\n------------------------------------------");
  console.log("2. Testing AvalAI.ir...");
  console.log("   Base URL:", AVALAI_URL);
  console.log("   Key:", AVALAI_KEY ? AVALAI_KEY.slice(0, 8) + "..." : "MISSING");

  if (!AVALAI_KEY) {
    console.log("❌ AVALAI_KEY is not defined.");
    return;
  }

  // 1. Test models endpoint
  try {
    const modelsRes = await fetch(`${AVALAI_URL.replace(/\/+$/, "")}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AVALAI_KEY}`,
      },
    });

    console.log(`   Models HTTP Status: ${modelsRes.status} ${modelsRes.statusText}`);
    if (modelsRes.ok) {
      const data = await modelsRes.json();
      const modelList = Array.isArray(data.data) ? data.data.map((m) => m.id) : [];
      console.log("   ✅ Available AvalAI Models Count:", modelList.length);
      const imgModels = modelList.filter((m) =>
        m.includes("dall") || m.includes("flux") || m.includes("image") || m.includes("midjourney")
      );
      console.log("   🎨 Image models available on AvalAI:", imgModels.length > 0 ? imgModels.join(", ") : "None specific or standard chat models");
      console.log("   Sample Models:", modelList.slice(0, 5).join(", "));
    } else {
      const errText = await modelsRes.text();
      console.log("   ⚠️ Models query failed:", errText);
    }
  } catch (err) {
    console.log("   ❌ Error querying AvalAI models:", err.message);
  }

  // 2. Test chat completion
  try {
    const chatRes = await fetch(`${AVALAI_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AVALAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    console.log(`   Chat Test HTTP Status: ${chatRes.status} ${chatRes.statusText}`);
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      const reply = chatData?.choices?.[0]?.message?.content;
      console.log(`   ✅ Chat success! Response: "${reply?.trim()}"`);
    } else {
      const errText = await chatRes.text();
      console.log("   ⚠️ Chat test response:", errText);
    }
  } catch (err) {
    console.log("   ❌ AvalAI chat test error:", err.message);
  }
}

async function testNineRouter() {
  console.log("\n------------------------------------------");
  console.log("3. Testing 9Router...");
  console.log("   Base URL:", NINE_ROUTER_URL);
  console.log("   Key:", NINE_ROUTER_KEY ? NINE_ROUTER_KEY.slice(0, 8) + "..." : "MISSING");

  if (!NINE_ROUTER_KEY) {
    console.log("❌ NINE_ROUTER_KEY is not defined.");
    return;
  }

  // 1. Test models endpoint
  try {
    const modelsRes = await fetch(`${NINE_ROUTER_URL.replace(/\/+$/, "")}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${NINE_ROUTER_KEY}`,
      },
    });

    console.log(`   Models HTTP Status: ${modelsRes.status} ${modelsRes.statusText}`);
    if (modelsRes.ok) {
      const data = await modelsRes.json();
      const modelList = Array.isArray(data.data) ? data.data.map((m) => m.id) : [];
      console.log("   ✅ Available 9Router Models Count:", modelList.length);
      const imgModels = modelList.filter((m) =>
        m.includes("flux") || m.includes("image") || m.includes("dall") || m.includes("edit") || m.includes("seed")
      );
      console.log("   🎨 Image models available on 9Router:", imgModels.length > 0 ? imgModels.slice(0, 10).join(", ") : "Standard chat/vision models");
      console.log("   Sample Models:", modelList.slice(0, 5).join(", "));
    } else {
      const errText = await modelsRes.text();
      console.log("   ⚠️ Models query failed:", errText);
    }
  } catch (err) {
    console.log("   ❌ Error querying 9Router models:", err.message);
  }

  // 2. Test chat completion
  try {
    const chatRes = await fetch(`${NINE_ROUTER_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NINE_ROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    console.log(`   Chat Test HTTP Status: ${chatRes.status} ${chatRes.statusText}`);
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      const reply = chatData?.choices?.[0]?.message?.content;
      console.log(`   ✅ Chat success! Response: "${reply?.trim()}"`);
    } else {
      const errText = await chatRes.text();
      console.log("   ⚠️ Chat test response:", errText);
    }
  } catch (err) {
    console.log("   ❌ 9Router chat test error:", err.message);
  }
}

async function run() {
  await testGemini();
  await testAvalAI();
  await testNineRouter();
  console.log("\n==========================================");
  console.log("              TEST COMPLETE               ");
  console.log("==========================================");
}

run();

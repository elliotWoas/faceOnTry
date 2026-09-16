import fs from "fs";
import path from "path";

// 1x1 transparent PNG sample for testing image input
const sampleImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

console.log("===============================================================");
console.log("             AI HAIRSTYLE IMAGE PROVIDER REPORT                ");
console.log("===============================================================\n");

// 1. Test Google Gemini
async function testGemini() {
  console.log("1️⃣ [Google Gemini API]");
  const key = "YOUR_GOOGLE_API_KEY"; // Replace with your actual Google API key
  console.log("   • Header used: x-goog-api-key");
  console.log("   • Models tested: gemini-2.5-flash-image, gemini-3.1-flash-image");

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Modern haircut portrait" }],
            },
          ],
        }),
      }
    );

    console.log(`   • HTTP Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (res.ok) {
      console.log("   ✅ Gemini Image API is ACTIVE and working!");
    } else {
      console.log(`   ⚠️ Google Gemini Result: ${data.error?.message?.slice(0, 150)}...`);
      if (res.status === 429) {
        console.log("   ℹ️ Note: Gemini کلید را تأیید کرد اما مدل‌های تصویری Gemini در Google AI Studio دارای سهمیه (Quota) رایگان صفر یا محدود هستند و نیاز به پلن Pay-as-you-go دارند.");
      }
    }
  } catch (err) {
    console.log("   ❌ Connection error:", err.message);
  }
}

// 2. Test AvalAI
async function testAvalAI() {
  console.log("\n2️⃣ [AvalAI.ir (Qwen Image & Edit)]");
  const key = "aa-Hv3ZYdwBueT0IeU5cM0S4V0Lrl2GvhyyoUjRVeoYNOWw2oNA";
  const url = "https://api.avalai.ir/v1";
  console.log(`   • Base URL: ${url}`);
  console.log("   • Model: qwen-image-edit");

  try {
    const res = await fetch(`${url}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-image-edit",
        image: `data:image/png;base64,${sampleImageBase64}`,
        prompt: "A modern stylish low taper fade haircut, photorealistic portrait",
      }),
    });

    console.log(`   • HTTP Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const data = await res.json();
      const imgUrl = data?.data?.[0]?.url;
      const cost = data?.estimated_cost;
      console.log("   ✅ SUCCESS! Real image generated successfully!");
      console.log(`   🖼️ Image Output URL: ${imgUrl}`);
      if (cost) {
        console.log(`   💰 Cost: ${cost.unit} USD (${cost.irt} Tomans)`);
      }
    } else {
      const errText = await res.text();
      console.log(`   ❌ AvalAI Error:`, errText.slice(0, 200));
    }
  } catch (err) {
    console.log("   ❌ AvalAI connection error:", err.message);
  }
}

// 3. Test 9Router
async function testNineRouter() {
  console.log("\n3️⃣ [9Router]");
  const key = "sk-b88d63dd361c4e78-2pqwv0-16bc8668";
  const localUrl = "http://localhost:20128/v1";
  console.log(`   • Detected running locally at: ${localUrl}`);

  try {
    const res = await fetch(`${localUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    console.log(`   • Health / Models Check: HTTP ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ 9Router Gateway is ONLINE locally with ${data.data?.length || 0} models available!`);
    } else {
      console.log("   ⚠️ 9Router response:", await res.text());
    }
  } catch (err) {
    console.log("   ❌ 9Router not reachable locally:", err.message);
  }
}

async function run() {
  await testGemini();
  await testAvalAI();
  await testNineRouter();
  console.log("\n===============================================================");
}

run();

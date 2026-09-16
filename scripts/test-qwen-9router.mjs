const AVALAI_KEY = "aa-Hv3ZYdwBueT0IeU5cM0S4V0Lrl2GvhyyoUjRVeoYNOWw2oNA";
const NINE_ROUTER_KEY = "sk-b88d63dd361c4e78-2pqwv0-16bc8668";

async function testAvalAIQwen() {
  console.log("--- Testing AvalAI qwen-image format ---");
  // 1. Test /images/generations with prompt
  try {
    const res = await fetch("https://api.avalai.ir/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AVALAI_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-image",
        prompt: "A man with modern fade haircut",
      }),
    });
    console.log("qwen-image status:", res.status);
    console.log("qwen-image response:", await res.text());
  } catch (e) {
    console.log("error:", e.message);
  }

  console.log("\n--- Testing AvalAI qwen-image-edit format ---");
  try {
    // 1x1 transparent png in base64
    const samplePng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const res = await fetch("https://api.avalai.ir/v1/images/edits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AVALAI_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-image-edit",
        image: `data:image/png;base64,${samplePng}`,
        prompt: "Change hairstyle to low fade",
      }),
    });
    console.log("qwen-image-edit status:", res.status);
    console.log("qwen-image-edit response:", await res.text());
  } catch (e) {
    console.log("error:", e.message);
  }
}

async function test9RouterEndpoints() {
  console.log("\n--- Testing 9Router URLs ---");
  const urls = [
    "https://api.9router.com/v1/chat/completions",
    "https://api.9router.com/chat/completions",
    "https://api.9router.com/models",
    "https://9router.com/api/v1/models"
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${NINE_ROUTER_KEY}` }
      });
      console.log(`${url} -> HTTP ${res.status}`);
      if (res.ok) {
        console.log("Content:", (await res.text()).slice(0, 150));
      }
    } catch (e) {
      console.log(`${url} failed:`, e.message);
    }
  }
}

async function run() {
  await testAvalAIQwen();
  await test9RouterEndpoints();
}
run();

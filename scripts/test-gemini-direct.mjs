import fs from "fs";
import path from "path";

const GEMINI_KEY = "YOUR_GOOGLE_API_KEY"; // Replace with your actual Google API key

async function testGeminiModels() {
  const models = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
    "gemini-3-pro-image",
    "gemini-2.5-flash"
  ];

  for (const m of models) {
    console.log(`\n================ Testing ${m} ================`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Generate an image of a man with a modern textured crop haircut" }]
            }
          ]
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        const json = JSON.parse(text);
        const parts = json?.candidates?.[0]?.content?.parts || [];
        console.log(`✅ ${m} responded with ${parts.length} parts!`);
        for (const p of parts) {
          if (p.inlineData) {
            console.log(`🎉 IMAGE GENERATED! Mime: ${p.inlineData.mimeType}, base64 length: ${p.inlineData.data?.length}`);
          }
          if (p.text) {
            console.log(`Text: ${p.text.slice(0, 120)}...`);
          }
        }
      } else {
        console.log(`Response body: ${text.slice(0, 300)}`);
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

testGeminiModels();

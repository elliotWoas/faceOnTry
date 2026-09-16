import fs from "fs";

// 1x1 test image
const sampleImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

console.log("==================================================================");
console.log("         تست اختصاصی سرویس‌های تصویری: اول AvalAI سپس Gemini         ");
console.log("==================================================================\n");

async function testAvalAI() {
  console.log("🟢 [1. تست سرویس AvalAI.ir]");
  const key = "YOUR_AVALAI_API_KEY"; // Replace with your
  const url = "https://api.avalai.ir/v1";

  console.log("   • آدرس سرور: " + url);
  console.log("   • کلید: " + key.slice(0, 8) + "...");
  console.log("   • مدل تست: qwen-image-edit (مدل ادیت مو و چهره)");

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
        prompt: "A modern stylish low taper fade haircut, photorealistic",
      }),
    });

    console.log(`   • وضعیت پاسخ (HTTP Status): ${res.status} ${res.statusText}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (res.ok) {
        console.log("   ✅ نتیجه: تولید موفقیت‌آمیز تصویر واقعی!");
        console.log(`   🖼️ آدرس تصویر تولید شده: ${data.data?.[0]?.url}`);
        if (data.estimated_cost) {
          console.log(`   💰 هزینه تخمینی: ${data.estimated_cost.unit} دلار (${data.estimated_cost.irt} تومان)`);
        }
      } else {
        console.log(`   ⚠️ پیام خطای سرور AvalAI:`);
        console.log("   " + JSON.stringify(data, null, 2));
      }
    } catch {
      console.log("   خروجی خام:", text.slice(0, 200));
    }
  } catch (err) {
    console.log("   ❌ خطای اتصال به AvalAI:", err.message);
  }
}

async function testGemini() {
  console.log("\n------------------------------------------------------------------");
  console.log("🔵 [2. تست سرویس Google Gemini]");
  const key = "YOUR_GOOGLE_API_KEY"; // Replace with your actual Google API key
  console.log("   • نوع کلید: Auth Key جدید گوگل (AQ.)");
  console.log("   • هدر ارسالی: x-goog-api-key (مطابق معماری جدید گوگل)");

  // تست اول: بررسی دسترسی و سلامت کلید با یک درخواست سبک
  console.log("\n   مرحله ۱: بررسی تایید اعتبار کلید (Auth)...");
  try {
    const authTestRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
        }),
      }
    );

    console.log(`   • وضعیت تأیید کلید: ${authTestRes.status} ${authTestRes.statusText}`);
    if (authTestRes.ok) {
      console.log("   ✅ احراز هویت با هدر x-goog-api-key کاملاً درست است و گوگل کلید را پذیرفت.");
    } else {
      const err = await authTestRes.text();
      console.log("   ⚠️ پاسخ گوگل برای اعتبارسنجی:", err.slice(0, 150));
    }
  } catch (e) {
    console.log("   خطا در تست اعتبارسنجی:", e.message);
  }

  // تست دوم: تست مدل‌های تصویری
  console.log("\n   مرحله ۲: تست مدل تولید تصویر (gemini-2.5-flash-image)...");
  try {
    const imgRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate hairstyle portrait" }] }],
        }),
      }
    );

    console.log(`   • وضعیت پاسخ مدل تصویری: ${imgRes.status} ${imgRes.statusText}`);
    const imgText = await imgRes.text();
    if (imgRes.ok) {
      console.log("   ✅ مدل تصویری جمینای کار می‌کند و خروجی می‌دهد!");
    } else {
      try {
        const json = JSON.parse(imgText);
        console.log("   ⚠️ پیام سرور گوگل:", json.error?.message?.slice(0, 200));
      } catch {
        console.log("   پاسخ خام:", imgText.slice(0, 200));
      }
    }
  } catch (e) {
    console.log("   خطای درخواست تصویر:", e.message);
  }
}

async function main() {
  await testAvalAI();
  await testGemini();
  console.log("\n==================================================================");
}

main();

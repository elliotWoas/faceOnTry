// Manual paid integration check: node scripts/test-optimized-live.mjs <image> [model] [reference]
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [imagePath, model = "flux.2-pro", referencePath] = process.argv.slice(2);
if (!imagePath) throw new Error("Provide a local portrait image path");
const form = new FormData();
form.append("mode", referencePath ? "try-hairstyle" : "recommend-hairstyle");
form.append("model", model);
form.append("userImage", new Blob([await readFile(imagePath)], { type: "image/jpeg" }), "portrait.jpg");
if (referencePath) {
  form.append("referenceImage", new Blob([await readFile(referencePath)], { type: "image/jpeg" }), "reference.jpg");
}
const response = await fetch("http://localhost:3000/api/generate", { method: "POST", body: form });
const result = await response.json();
if (!response.ok) throw new Error(`${response.status}: ${result.error}`);
if (!result.imageUrl?.startsWith("data:image/")) throw new Error("No inline image returned");
const output = path.join(process.cwd(), "python_service", "models", "test_result.png");
await writeFile(output, Buffer.from(result.imageUrl.split(",", 2)[1], "base64"));
console.log(`model=${result.model} output=${output}`);

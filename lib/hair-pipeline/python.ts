import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

export interface PreparedImage {
  target: string;
  reference?: string;
  mask: string;
  allowed: string;
  box: [number, number, number, number];
  size: [number, number];
  contentBox: [number, number, number, number];
}

export async function runImageProcessor<T>(payload: Record<string, unknown>): Promise<T> {
  const localPython = path.join(process.cwd(), ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const python = process.env.PYTHON_BIN || (existsSync(localPython) ? localPython : "python");
  const script = path.join(process.cwd(), "python_service", "processor.py");
  return new Promise<T>((resolve, reject) => {
    const child = spawn(python, [script], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    const timer = setTimeout(() => child.kill(), 60_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdin.on("error", () => { /* close handler reports the processor failure */ });
    child.stdout.on("data", (chunk: string) => { output += chunk; });
    child.stderr.on("data", (chunk: string) => { errors += chunk.slice(0, 1000); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Python processor unavailable: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(output) as T & { ok: boolean; error?: string };
        if (code !== 0 || !result.ok) throw new Error(result.error || errors || "Python image processing failed");
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Invalid Python processor response"));
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

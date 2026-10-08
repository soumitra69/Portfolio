import concurrently from "concurrently";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
let backendSettings = {};
try {
  backendSettings = parseEnv(await readFile(new URL("../backend/.env", import.meta.url), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const backendPort = Number(process.env.PORT || backendSettings.PORT || 5000);
let backendRunning = false;
try {
  const response = await fetch(`http://127.0.0.1:${backendPort}/api/health`, { signal: AbortSignal.timeout(1000) });
  backendRunning = response.ok && (await response.json()).status === "ok";
} catch { /* Start the backend when no healthy instance is available. */ }

const commands = [{ command: "npm run dev:web --workspace frontend", name: "frontend" }];
if (backendRunning) console.log(`Using the running portfolio backend on port ${backendPort}.`);
else commands.push({ command: "npm run dev --workspace backend", name: "backend" });
const { result } = concurrently(commands, { cwd: root, killOthersOn: ["success", "failure"] });

result.catch(() => { process.exitCode = 1; });

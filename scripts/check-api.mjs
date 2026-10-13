import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { getBackendURL } from "../frontend/services/backend-url.mjs";
let settings = {};
try { settings = parseEnv(await readFile(new URL("../frontend/.env.local", import.meta.url), "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const base = getBackendURL({ ...settings, ...process.env });
try {
  for (const [path, expected] of [["/api/health", 200], ["/api/content", 200], ["/api/admin/cms", 401]]) {
    const response = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(45000) });
    if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}. Deploy the matching Portfolio-backend version and check its environment.`);
    console.log(`${path}: ${response.status}`);
    if (path === "/api/content") {
      const content = await response.json();
      if (!content.profile || !content.settings || !Array.isArray(content.sections)) throw new Error("The backend content API is incompatible with this frontend.");
    }
  }
  console.log("Backend APIs are reachable and compatible; anonymous admin access is blocked.");
} catch (error) { console.error(error.name === "TimeoutError" || error instanceof TypeError ? "Unable to reach the configured backend." : error.message); process.exitCode = 1; }

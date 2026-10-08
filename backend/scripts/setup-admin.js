import { readFile, writeFile } from "node:fs/promises";

const envFile = new URL("../.env", import.meta.url);
let content;
try {
  content = await readFile(envFile, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  content = "PORT=5000\n";
}

for (const [name, value] of Object.entries({ ADMIN_USERNAME: "admin@gmail.com", ADMIN_PASSWORD: "admin" })) {
  const entry = new RegExp(`^${name}=.*$`, "gm");
  content = entry.test(content)
    ? content.replace(entry, () => `${name}=${value}`)
    : `${content.trimEnd()}\n${name}=${value}\n`;
}

await writeFile(envFile, content, { mode: 0o600 });
console.log("Admin login set to admin@gmail.com. Other environment settings were preserved. Restart the backend if it is already running.");

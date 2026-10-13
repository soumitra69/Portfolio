import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { hashPassword, createAdminAccounts } from "../src/admin-accounts.js";
import { connectDatabase } from "../config/database.js";

const envFile = new URL("../.env", import.meta.url);
let content = "PORT=5000\n";
try { content = await readFile(envFile, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const settings = { ...parseEnv(content), ...process.env };
const username = settings.ADMIN_USERNAME || "admin@gmail.com";
const password = settings.ADMIN_PASSWORD;
let connection;
try {
  let passwordHash = settings.ADMIN_PASSWORD_HASH;
  if (settings.MONGODB_URI) {
    connection = await connectDatabase(settings.MONGODB_URI, settings.MONGODB_DB || "portfolio");
    const collection = connection.db.collection("admins");
    const accounts = createAdminAccounts(collection);
    const existing = await collection.findOne({ _id: "owner" });
    if (existing) {
      if (existing.username !== username || (password && !await accounts.authenticate(username, password))) throw new Error("Existing access must be preserved.");
      passwordHash ||= existing.passwordHash;
    } else {
      if (!password) throw new Error("Set ADMIN_PASSWORD privately for first-time provisioning.");
      await accounts.provision(username, password);
    }
  }
  if (password) passwordHash = await hashPassword(password);
  if (!passwordHash) throw new Error("Set ADMIN_PASSWORD privately for first-time provisioning.");
  const values = { ADMIN_USERNAME: username, ADMIN_PASSWORD_HASH: passwordHash, JWT_SECRET: settings.JWT_SECRET || randomBytes(48).toString("hex") };
  content = content.replace(/^ADMIN_PASSWORD=.*(?:\r?\n|$)/gm, "");
  for (const [name, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    content = pattern.test(content) ? content.replace(pattern, () => `${name}=${value}`) : `${content.trimEnd()}\n${name}=${value}\n`;
  }
  await writeFile(envFile, content, { mode: 0o600 });
  console.log(`Admin access configured for ${username}. Password hashes and secrets stay private. Existing database settings were preserved.`);
} catch (error) { console.error(`Admin setup failed (${error.name}). Check the database settings and existing owner credentials.`); process.exitCode = 1; }
finally { await connection?.close(); }

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const scryptOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const validCredentials = (username, password) => typeof username === "string"
  && username.length > 0 && username.length <= 254 && typeof password === "string"
  && password.length > 0 && password.length <= 1024;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64, scryptOptions);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length > 1024
    || typeof hash !== "string" || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) return false;
  const [, salt, digest] = hash.split("$");
  const key = await deriveKey(password, salt, 64, scryptOptions);
  return timingSafeEqual(key, Buffer.from(digest, "hex"));
}

// Keep the single portfolio owner's account separate from public portfolio data.
export function createAdminAccounts(collection) {
  return {
    async provision(username, password) {
      if (!validCredentials(username, password)) {
        throw new Error("Set valid ADMIN_USERNAME and ADMIN_PASSWORD for the one-time database setup.");
      }
      if (await collection.findOne({ _id: "owner" })) return false;
      const account = { name: process.env.ADMIN_NAME || "Portfolio owner", email: username, username, passwordHash: await hashPassword(password), role: "admin", tokenVersion: 0, createdAt: new Date() };
      try {
        const result = await collection.updateOne({ _id: "owner" }, {
          $setOnInsert: account,
        }, { upsert: true });
        return result.upsertedCount === 1;
      } catch (error) {
        // Simultaneous setup attempts cannot overwrite an existing account.
        if (error.code === 11000) return false;
        throw error;
      }
    },
    async authenticate(username, password) {
      if (!validCredentials(username, password)) return null;
      const account = await collection.findOne({ _id: "owner" });
      if (!account) {
        const error = new Error("Run yarn setup:admin:db once to create the MongoDB admin account.");
        error.code = "ADMIN_NOT_CONFIGURED";
        throw error;
      }
      const correctPassword = await verifyPassword(password, account.passwordHash);
      return account.username === username && correctPassword && (!account.role || account.role === "admin") ? { username: account.username } : null;
    },
  };
}

import { createApp } from "../src/app.js";
import { createFileStore } from "../src/store.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const directory = await mkdtemp(join(tmpdir(), "portfolio-browser-tests-"));
const store = createFileStore(join(directory, "data.json"));
const server = createApp({ store, username: "admin@gmail.com", password: "Admin", jwtSecret: randomBytes(48).toString("hex"), analyticsEnabled: true,
  securityEnv: { CORS_ORIGINS: "http://127.0.0.1:3100,http://localhost:3100" }, notifier: { enabled: false, send: async () => "disabled" },
}).listen(5055, "127.0.0.1", () => console.log("Isolated browser-test API ready"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => {
  await store.close();
  if (dirname(directory) !== tmpdir() || !directory.startsWith(join(tmpdir(), "portfolio-browser-tests-"))) throw new Error("Unexpected test directory");
  await rm(directory, { recursive: true, force: true }); process.exit(0);
}));

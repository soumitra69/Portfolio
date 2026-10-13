const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  // Allow cold Next.js compilation on Windows; individual UI assertions stay bounded.
  testDir: "./tests/e2e", timeout: 120000, expect: { timeout: 10000 }, workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: "node backend/test-support/e2e-server.js", url: "http://127.0.0.1:5055/api/health", reuseExistingServer: false, timeout: 30000 },
    { command: process.env.E2E_PRODUCTION === "true"
      ? "npm run start --workspace frontend -- --port 3100 --hostname 127.0.0.1"
      : "npm run dev:web --workspace frontend -- --port 3100 --hostname 127.0.0.1", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120000,
      env: { BACKEND_URL: "http://127.0.0.1:5055", ANALYTICS_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" } },
  ],
});

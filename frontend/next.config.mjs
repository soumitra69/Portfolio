import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// npm workspaces hoist Next.js into the repository's node_modules.
// A standalone copy of frontend uses its own directory instead.
const buildRoot = fileURLToPath(new URL(
  existsSync(new URL("../package-lock.json", import.meta.url)) ? "../" : "./",
  import.meta.url,
));
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: buildRoot },
  outputFileTracingRoot: buildRoot,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;

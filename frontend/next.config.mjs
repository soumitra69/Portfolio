import { existsSync } from "node:fs";
import { getBackendURL } from "./services/backend-url.mjs";
import { fileURLToPath } from "node:url";

// npm workspaces hoist Next.js into the repository's node_modules.
// A standalone copy of frontend uses its own directory instead.
const buildRoot = fileURLToPath(new URL(
  existsSync(new URL("../package-lock.json", import.meta.url)) ? "../" : "./",
  import.meta.url,
));
const backendUrl = getBackendURL();

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  turbopack: { root: buildRoot },
  outputFileTracingRoot: buildRoot,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, {
      source: "/admin/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }];
  },
};

export default nextConfig;

import { cache } from "react";
import { getBackendURL } from "./backend-url.mjs";

export const getPortfolio = cache(async () => {
  const base = getBackendURL();
  try {
    const response = await fetch(`${base}/api/content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
});

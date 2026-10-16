import offlineContent from "../shared/offline-content.json" with { type: "json" };
import { getBackendURL } from "./backend-url.mjs";
import { preparePublicContent } from "../shared/seo-content.mjs";

export async function readPublicContent({ fetcher = fetch, env = process.env } = {}) {
  const base = getBackendURL(env);
  try {
    const response = await fetcher(`${base}/api/content`, {
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Content unavailable");
    const content = await response.json();
    if (!content.profile || !content.settings || !content.about || !content.contactInfo ||
      !["sections", "navigation", "projects", "skills", "services", "experience", "education", "gallery", "socialLinks"].every((key) => Array.isArray(content[key]))) throw new Error("Incompatible public content");
    return preparePublicContent({ ...content, availability: "live", isStatic: false });
  } catch {
    return preparePublicContent({ ...structuredClone(offlineContent), availability: "offline", isStatic: true });
  }
}

import { SITE_URL } from "../shared/seo-content.mjs";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/admin/", "/api/messages", "/api/inquiries", "/api/analytics"] },
    sitemap: new URL("sitemap.xml", SITE_URL).href,
  };
}

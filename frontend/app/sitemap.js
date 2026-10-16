import { SITE_URL } from "../shared/seo-content.mjs";

// Sections are homepage anchors, not separate indexable pages. No invented dates.
export default function sitemap() {
  return [{ url: SITE_URL }];
}

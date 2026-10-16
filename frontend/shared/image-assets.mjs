import manifest from "./image-assets.json" with { type: "json" };

export function imageProps(url, width, height) {
  const local = manifest[url];
  const src = local?.src || url;
  return {
    src, width: local?.width || width, height: local?.height || height,
    // Private CMS uploads keep their original same-origin access behavior.
    unoptimized: src.startsWith("/api/") || /^https?:\/\//.test(src),
  };
}

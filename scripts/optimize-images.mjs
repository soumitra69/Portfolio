// Run from Portfolio with `node scripts/optimize-images.mjs` after replacing an
// original local image. Keep original paths available for existing CMS records.
import sharp from "sharp";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../frontend/", import.meta.url));
const assets = [
  ["Digital_Marketing_Agency_Website_ (1).png", "projects/digital-marketing-agency-website.webp", 1600],
  ["soumitra69.github.io_Cryptocurrency_Price_Tracker_Website_.png", "projects/cryptocurrency-price-tracker.webp", 1600],
  ["CineFlix-A-stylish-movie-streaming-download-website_.png", "projects/cineflix-movie-website.webp", 1600],
  ["DSC_0068.JPG", "soumitra-samanta-frontend-developer.webp", 512],
];
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;
for (const [source, target, width] of assets) {
  const sourceFile = path.join(root, "public/assets", source);
  const targetFile = path.join(root, "public/assets", target);
  await mkdir(path.dirname(targetFile), { recursive: true });
  const info = await sharp(sourceFile).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(targetFile);
  manifest[`/assets/${source}`] = { src: `/assets/${target}`, width: info.width, height: info.height };
  originalBytes += (await stat(sourceFile)).size;
  optimizedBytes += info.size;
  console.log(`${source}: ${(await stat(sourceFile)).size} -> ${info.size} bytes`);
}
await writeFile(path.join(root, "shared/image-assets.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Original: ${originalBytes} bytes; optimized: ${optimizedBytes} bytes.`);

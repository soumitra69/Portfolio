import sharp from "sharp";
import { fileURLToPath } from "node:url";

const publicDirectory = new URL("../frontend/public/", import.meta.url);
const file = relative => fileURLToPath(new URL(relative, publicDirectory));
await sharp(file("assets/seo/soumitra-samanta-web-developer.svg")).png().toFile(file("assets/seo/soumitra-samanta-web-developer.png"));
await sharp(file("favicon.svg")).resize(180, 180).png().toFile(file("apple-touch-icon.png"));
console.log("Generated 1200×630 social preview and 180×180 Apple touch icon.");

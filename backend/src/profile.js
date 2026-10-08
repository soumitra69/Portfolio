import express, { Router } from "express";
import sharp from "sharp";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import defaultProfile from "../shared/profile.json" with { type: "json" };

export const defaultUploadDirectory = fileURLToPath(new URL("../data/uploads/", import.meta.url));

async function removePreviousPhoto(url, directory) {
  const filename = /^\/api\/media\/([a-f0-9-]{36}\.jpg)$/.exec(url || "")?.[1];
  if (filename) await rm(join(directory, filename), { force: true }).catch((error) => console.error("Unable to remove previous profile photo:", error.message));
}

export function createProfileRouter({ store, uploadDirectory }) {
  const router = Router();
  router.post("/profile-photo", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "10mb" }), async (request, response) => {
    if (!Buffer.isBuffer(request.body) || !request.body.length) {
      return response.status(415).json({ message: "Choose a JPEG, PNG, or WebP image." });
    }
    let image;
    try {
      const input = sharp(request.body, { limitInputPixels: 30000000, failOn: "warning" });
      const metadata = await input.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("Unsupported image format");
      image = await input.rotate().resize(600, 600, { fit: "cover", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    } catch {
      return response.status(400).json({ message: "The image could not be read. Choose a valid JPEG, PNG, or WebP image under 30 megapixels." });
    }
    const filename = `${randomUUID()}.jpg`;
    const photoUrl = `/api/media/${filename}`;
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(join(uploadDirectory, filename), image, { mode: 0o600 });
    let previous;
    try {
      previous = await store.update((data) => {
        const old = data.profile.photoUrl;
        data.profile = { ...data.profile, photoUrl };
        return old;
      });
    } catch (error) {
      await rm(join(uploadDirectory, filename), { force: true });
      throw error;
    }
    await removePreviousPhoto(previous, uploadDirectory);
    response.json({ photoUrl });
  });
  router.delete("/profile-photo", async (_request, response) => {
    const previous = await store.update((data) => {
      const old = data.profile.photoUrl;
      data.profile = { ...data.profile, ...defaultProfile };
      return old;
    });
    await removePreviousPhoto(previous, uploadDirectory);
    response.json(defaultProfile);
  });
  return router;
}

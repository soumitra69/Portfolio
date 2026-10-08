import express from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { createStore } from "./store.js";
import { createAdminRouter } from "./admin.js";
import { defaultUploadDirectory } from "./profile.js";

export function createApp({ store = createStore(), uploadDirectory = defaultUploadDirectory, contactLimit = 10, username, password } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/projects", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json((await store.read()).projects);
  });
  app.get("/api/skills", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json((await store.read()).skills);
  });
  app.get("/api/experience", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json((await store.read()).experience.toSorted((a, b) => b.startDate.localeCompare(a.startDate)));
  });
  app.get("/api/profile", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json((await store.read()).profile);
  });
  app.use("/api/media", express.static(uploadDirectory, {
    index: false, maxAge: "1y", immutable: true,
    setHeaders: (response) => response.set("X-Content-Type-Options", "nosniff"),
  }));
  app.use("/api/admin", createAdminRouter({ store, uploadDirectory, username, password }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: contactLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many messages. Please try again in 15 minutes." },
  });

  app.post("/api/contact", limiter, async (request, response) => {
    const { name, email, message } = request.body || {};
    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return response.status(400).json({ message: "Name, email, and message are required." });
    }

    const contact = { name: name.trim(), email: email.trim(), message: message.trim() };
    if (!contact.name || contact.name.length > 100 || !contact.message || contact.message.length > 5000
      || contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return response.status(400).json({ message: "Enter a valid name, email, and message within the allowed lengths." });
    }

    const savedMessage = { id: randomUUID(), ...contact, read: false, createdAt: new Date().toISOString() };
    await store.update((data) => data.messages.push(savedMessage));
    return response.status(201).json({ message: "Thank you! Your message has been received." });
  });

  app.use((_request, response) => response.status(404).json({ message: "API route not found." }));

  app.use((error, _request, response, _next) => {
    if (error.type === "entity.parse.failed") {
      return response.status(400).json({ message: "Request body must be valid JSON." });
    }
    if (error.type === "entity.too.large") {
      return response.status(413).json({ message: _request.path.endsWith("/profile-photo") ? "Choose an image smaller than 10 MB." : "Message is too large." });
    }
    console.error("Portfolio API failed:", error.message);
    return response.status(500).json({ message: "Unable to complete your request. Please try again later." });
  });

  return app;
}

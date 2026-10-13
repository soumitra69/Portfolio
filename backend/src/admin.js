import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import skillIcons from "../shared/skill-icons.json" with { type: "json" };
import { createExperienceRouter } from "./experience.js";
import { createProfileRouter } from "./profile.js";
import { createAdminAuth } from "../middleware/auth.js";
import { verifyPassword, hashPassword } from "./admin-accounts.js";

const allowedSkillIcons = new Set(skillIcons.map((icon) => icon.value));

function validateSkill(input) {
  if (typeof input?.name !== "string" || !input.name.trim() || input.name.trim().length > 60
    || !allowedSkillIcons.has(input.icon)) return null;
  return { name: input.name.trim(), icon: input.icon };
}

function matches(value, expected) {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  return timingSafeEqual(createHash("sha256").update(value).digest(), createHash("sha256").update(expected).digest());
}

export function validateProject(input) {
  const { title, description, image, demoUrl, githubUrl, technologies } = input || {};
  const validUrl = (url) => {
    try { return ["http:", "https:"].includes(new URL(url).protocol); } catch { return false; }
  };
  if (typeof title !== "string" || !title.trim() || title.length > 150
    || typeof description !== "string" || !description.trim() || description.length > 2000
    || typeof image !== "string" || !/^\/assets\/[\w .()\-]+\.(png|jpe?g|webp)$/i.test(image)
    || !validUrl(demoUrl) || !validUrl(githubUrl)
    || !Array.isArray(technologies) || technologies.length < 1 || technologies.length > 10
    || technologies.some((tech) => typeof tech !== "string" || !tech.trim() || tech.length > 40)) return null;
  return { title: title.trim(), description: description.trim(), image, demoUrl, githubUrl, technologies: technologies.map((tech) => tech.trim()) };
}

export function createAdminRouter({ store, uploadDirectory, submissionRouter, jwtSecret, username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD }) {
  const router = Router();
  const auth = createAdminAuth({ store, secret: jwtSecret });
  // Local JSON-mode setup can provide a hash; never persist a plaintext password.
  const localPasswordHash = !store.authenticateAdmin && password ? hashPassword(password) : Promise.resolve(process.env.ADMIN_PASSWORD_HASH);

  router.use((request, response, next) => {
    response.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(request.method) && request.get("X-Admin-Request") !== "1") {
      return response.status(403).json({ message: "Invalid admin request." });
    }
    next();
  });

  router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Too many login attempts. Try again in 15 minutes." } }), async (request, response) => {
    let account;
    if (store.authenticateAdmin) {
      try {
        account = await store.authenticateAdmin(request.body?.username, request.body?.password);
      } catch (error) {
        console.error(`Admin database login failed (${error.code === "ADMIN_NOT_CONFIGURED" ? error.message : error.name}).`);
        return response.status(503).json({ message: error.code === "ADMIN_NOT_CONFIGURED"
          ? "The admin account has not been created in the database yet."
          : "The admin service is unavailable. Please try again shortly." });
      }
    } else {
      const hash = await localPasswordHash;
      if (!username || !hash) {
        return response.status(503).json({ message: "Admin login is not configured. Connect the backend to MongoDB and create the admin account." });
      }
      if (matches(request.body?.username, username) && await verifyPassword(request.body?.password, hash)) account = { username };
    }
    if (!account) {
      return response.status(401).json({ message: "Incorrect username or password." });
    }
    await auth.signIn(account.username, response);
    response.json({ username: account.username });
  });

  router.use(auth.protect);

  router.get("/session", (request, response) => response.json({ username: request.adminUsername }));
  router.use(createExperienceRouter(store));
  router.use(createProfileRouter({ store, uploadDirectory }));
  if (submissionRouter) router.use(submissionRouter);
  router.post("/logout", async (_request, response) => {
    await auth.signOut(response);
    response.json({ message: "Signed out." });
  });
  router.post("/skills", async (request, response) => {
    const skill = validateSkill(request.body);
    if (!skill) return response.status(400).json({ message: "Enter a skill name of up to 60 characters and select an icon." });
    const created = { id: randomBytes(16).toString("hex"), ...skill };
    await store.update((data) => data.skills.push(created));
    response.status(201).json(created);
  });
  router.put("/skills/:id", async (request, response) => {
    const skill = validateSkill(request.body);
    if (!skill) return response.status(400).json({ message: "Enter a skill name of up to 60 characters and select an icon." });
    const saved = await store.update((data) => {
      const index = data.skills.findIndex((item) => item.id === request.params.id);
      if (index < 0) return null;
      data.skills[index] = { id: request.params.id, ...skill };
      return data.skills[index];
    });
    response.status(saved ? 200 : 404).json(saved || { message: "Skill not found." });
  });
  router.delete("/skills/:id", async (request, response) => {
    const deleted = await store.update((data) => {
      const index = data.skills.findIndex((item) => item.id === request.params.id);
      if (index < 0) return false;
      data.skills.splice(index, 1);
      return true;
    });
    response.status(deleted ? 200 : 404).json({ message: deleted ? "Skill deleted." : "Skill not found." });
  });
  router.post("/projects", async (request, response) => {
    const project = validateProject(request.body);
    if (!project) return response.status(400).json({ message: "Enter a title, description, local image path, valid links, and technologies." });
    const created = { id: randomBytes(16).toString("hex"), ...project };
    await store.update((data) => data.projects.push(created));
    response.status(201).json(created);
  });
  router.put("/projects/:id", async (request, response) => {
    const project = validateProject(request.body);
    if (!project) return response.status(400).json({ message: "Enter a title, description, local image path, valid links, and technologies." });
    const saved = await store.update((data) => {
      const index = data.projects.findIndex((item) => item.id === request.params.id);
      if (index < 0) return null;
      data.projects[index] = { id: request.params.id, ...project };
      return data.projects[index];
    });
    response.status(saved ? 200 : 404).json(saved || { message: "Project not found." });
  });
  router.delete("/projects/:id", async (request, response) => {
    const deleted = await store.update((data) => {
      const index = data.projects.findIndex((item) => item.id === request.params.id);
      if (index < 0) return false;
      data.projects.splice(index, 1);
      return true;
    });
    response.status(deleted ? 200 : 404).json({ message: deleted ? "Project deleted." : "Project not found." });
  });
  return router;
}

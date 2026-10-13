import express from "express";
import { randomUUID } from "node:crypto";
import { createStore } from "./store.js";
import { createAdminRouter } from "./admin.js";
import { defaultUploadDirectory } from "./profile.js";
import { applySecurity } from "../middleware/security.js";
import { errorHandler } from "../middleware/error-handler.js";
import { submissionRoutes } from "../routes/submissions.js";
import { submissionRepository } from "../utils/submissions.js";
import { createNotifier } from "../utils/email.js";

export function createApp({ store = createStore(), uploadDirectory = defaultUploadDirectory, contactLimit = 10, username, password, jwtSecret,
  notifier = createNotifier(), analyticsEnabled = process.env.ANALYTICS_ENABLED === "true", securityEnv = process.env } = {}) {
  const app = express();
  applySecurity(app, securityEnv);
  app.use(express.json({ limit: "16kb" }));
  const routes = submissionRoutes({ repository: submissionRepository(store), notifier, contactLimit,
    analyticsSecret: jwtSecret || process.env.JWT_SECRET || randomUUID(), analyticsEnabled });

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
  app.use("/api/admin", createAdminRouter({ store, uploadDirectory, username, password, jwtSecret, submissionRouter: routes.adminRouter }));
  app.use("/api", routes.publicRouter);

  app.use((_request, response) => response.status(404).json({ message: "API route not found." }));

  app.use(errorHandler);

  return app;
}

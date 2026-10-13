import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createSubmissionControllers } from "../controllers/submissions.js";
import { normalizeVisit } from "../utils/analytics.js";

export function submissionRoutes({ repository, notifier, contactLimit = 10, analyticsSecret, analyticsEnabled = true }) {
  const publicRouter = Router(); const adminRouter = Router();
  const controllers = createSubmissionControllers({ repository, notifier });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: contactLimit, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many messages. Please try again in 15 minutes." } });
  publicRouter.post("/contact", limiter, controllers.submit("contact"));
  publicRouter.post("/inquiries", limiter, controllers.submit("inquiry"));
  const visitLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Visit limit reached." } });
  publicRouter.post("/analytics/visit", visitLimit, async (request, response) => {
    if (!analyticsEnabled || request.get("DNT") === "1" || request.get("Sec-GPC") === "1") return response.status(204).end();
    const visit = normalizeVisit(request.body, request.headers, analyticsSecret);
    if (!visit) return response.status(400).json({ message: "Invalid visit." });
    await repository.recordVisit(visit); response.status(204).end();
  });
  const retryLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
  for (const [path, kind] of [["messages", "contact"], ["inquiries", "inquiry"]]) {
    adminRouter.get(`/${path}`, controllers.list(kind));
    adminRouter.get(`/${path}/:id`, controllers.detail(kind));
    adminRouter.patch(`/${path}/:id`, controllers.update(kind));
    adminRouter.delete(`/${path}/:id`, controllers.remove(kind));
    adminRouter.post(`/${path}/:id/notification`, retryLimit, controllers.retryNotification(kind));
  }
  adminRouter.get("/analytics", async (_request, response) => response.json(await repository.analytics()));
  adminRouter.get("/notifications/status", (_request, response) => response.json({ configured: notifier.enabled }));
  adminRouter.get("/overview", async (_request, response) => response.json(await repository.overview()));
  return { publicRouter, adminRouter };
}

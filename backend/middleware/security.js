import cors from "cors";
import helmet from "helmet";

export function applySecurity(app, env = process.env) {
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY.split(",").map((value) => value.trim()));
  const origins = (env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map((origin) => origin.trim()).filter(Boolean);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // Reject disallowed browser origins before processing submissions or auth.
  app.use((request, response, next) => {
    const origin = request.get("Origin");
    if (origin && !origins.includes(origin)) return response.status(403).json({ message: "This website is not allowed to access the API." });
    next();
  });
  app.use(cors({ origin: origins, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "X-Admin-Request"] }));
}

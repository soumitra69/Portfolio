export function validateEnvironment(env = process.env) {
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  if (env.NODE_ENV === "production") {
    if (!env.MONGODB_URI) throw new Error("Production requires MONGODB_URI; configure it on the backend host.");
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error("Production requires a JWT_SECRET with at least 32 characters.");
    if (!env.CORS_ORIGINS) throw new Error("Production requires CORS_ORIGINS for the portfolio frontend.");
  }
  if (env.SMTP_HOST && (!env.SMTP_FROM || !env.NOTIFICATION_EMAIL)) {
    throw new Error("SMTP_FROM and NOTIFICATION_EMAIL are required when SMTP_HOST is configured.");
  }
  return { port };
}

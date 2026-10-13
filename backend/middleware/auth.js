import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "node:crypto";

export function createAdminAuth({ store, secret = process.env.JWT_SECRET, production = process.env.NODE_ENV === "production", ttlSeconds = 8 * 60 * 60 }) {
  if (secret && secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  if (!secret && production) throw new Error("JWT_SECRET is required in production.");
  const signingKey = secret || randomBytes(48).toString("hex");
  const cookieOptions = { httpOnly: true, sameSite: "strict", secure: production, path: "/api/admin" };
  let localVersion = 0;
  const version = async () => store.getAdminAuthVersion ? store.getAdminAuthVersion() : localVersion;
  return {
    cookieOptions,
    async signIn(username, response) {
      const token = jwt.sign({ username, role: "admin", version: await version() }, signingKey, {
        algorithm: "HS256", issuer: "portfolio-backend", audience: "portfolio-admin", subject: "owner", jwtid: randomUUID(), expiresIn: ttlSeconds,
      });
      response.cookie("portfolio_admin", token, { ...cookieOptions, maxAge: ttlSeconds * 1000 });
    },
    async protect(request, response, next) {
      const token = request.get("Cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith("portfolio_admin="))?.slice("portfolio_admin=".length);
      if (!token) return response.status(401).json({ message: "Please sign in to continue." });
      let claims;
      try {
        claims = jwt.verify(token, signingKey, { algorithms: ["HS256"], issuer: "portfolio-backend", audience: "portfolio-admin", subject: "owner" });
        if (claims.role !== "admin" || typeof claims.username !== "string" || !claims.jti) throw new Error("Invalid admin token");
      } catch { return response.status(401).json({ message: "Your session has expired. Please sign in again." }); }
      try {
        if (claims.version !== await version()) return response.status(401).json({ message: "Please sign in to continue." });
      } catch { return response.status(503).json({ message: "The admin service is unavailable. Please try again shortly." }); }
      request.adminUsername = claims.username;
      next();
    },
    async signOut(response) {
      if (store.revokeAdminSessions) await store.revokeAdminSessions(); else localVersion++;
      response.clearCookie("portfolio_admin", cookieOptions);
    },
  };
}

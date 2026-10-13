// Server-side origin shared by API rewrites and server-rendered content reads.
export function getBackendURL(env = process.env) {
  const value = env.BACKEND_URL || (env.NODE_ENV === "production"
    ? "https://portfolio-backend-vs7k.onrender.com" : "http://127.0.0.1:5000");
  let url;
  try { url = new URL(value); } catch { throw new Error("Set BACKEND_URL to the backend's HTTP(S) origin."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("BACKEND_URL must be an HTTP(S) origin without credentials, an /api path, query or fragment.");
  }
  return url.origin;
}

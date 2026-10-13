import { createHmac } from "node:crypto";

export function normalizeVisit(body, headers, secret, now = new Date()) {
  if (!body || body.path !== "/" || typeof body.visitorId !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(body.visitorId)) return null;
  const agent = headers["user-agent"] || "";
  const device = /iPad|Tablet/i.test(agent) ? "Tablet" : /Mobile|Android|iPhone/i.test(agent) ? "Mobile" : "Desktop";
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Other";
  let referrer = "Direct";
  try { const url = new URL(body.referrer); if (["http:", "https:"].includes(url.protocol)) referrer = url.hostname.slice(0, 128); } catch { /* No external referrer. */ }
  const date = now.toISOString().slice(0, 10);
  // Daily rotation prevents linking a visitor across days. No IP or raw user agent is stored.
  const visitor = createHmac("sha256", secret).update(`${date}:${body.visitorId}`).digest("hex");
  return { date, visitor, path: "/", device, browser, referrer, lastVisitAt: now.toISOString() };
}

export const encodeDimension = (label) => Buffer.from(label).toString("base64url");
export function summarizeVisits(days) {
  const totals = { pages: {}, devices: {}, browsers: {}, referrers: {} };
  for (const day of days) for (const dimension of Object.keys(totals)) {
    for (const [key, count] of Object.entries(day[dimension] || {})) {
      const label = Buffer.from(key, "base64url").toString();
      totals[dimension][label] = (totals[dimension][label] || 0) + count;
    }
  }
  const ordered = (values) => Object.entries(values).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return {
    totalVisits: days.reduce((sum, day) => sum + day.visits, 0),
    dailyUniqueVisitors: days.reduce((sum, day) => sum + (day.visitors?.length || 0), 0),
    days: days.map((day) => ({ date: day.date, visits: day.visits, uniqueVisitors: day.visitors?.length || 0, lastVisitAt: day.lastVisitAt })).sort((a, b) => a.date.localeCompare(b.date)),
    ...Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, ordered(value)])),
    retentionDays: 90,
  };
}

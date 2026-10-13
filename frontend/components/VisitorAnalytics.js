"use client";

import { useEffect } from "react";

export default function VisitorAnalytics({ enabled }) {
  useEffect(() => {
    if (!enabled || navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    let visitorId;
    const date = new Date().toISOString().slice(0, 10);
    const pageKey = `portfolio-visit:${date}:${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(pageKey)) return;
      const key = `portfolio-visitor:${date}`;
      visitorId = sessionStorage.getItem(key) || crypto.randomUUID();
      // Only a session-scoped, daily rotating random ID; no cookies or fingerprints.
      for (const stored of Object.keys(sessionStorage)) if (stored.startsWith("portfolio-visitor:") && stored !== key) sessionStorage.removeItem(stored);
      sessionStorage.setItem(key, visitorId); sessionStorage.setItem(pageKey, "1");
    } catch { return; }
    let referrer = "";
    try { const url = new URL(document.referrer); if (url.origin !== window.location.origin) referrer = url.origin; } catch { /* No referrer. */ }
    fetch("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, visitorId, referrer }), keepalive: true, signal: AbortSignal.timeout(8000),
    }).then((response) => { if (!response.ok) sessionStorage.removeItem(pageKey); }).catch(() => { try { sessionStorage.removeItem(pageKey); } catch {} });
  }, [enabled]);
  return null;
}

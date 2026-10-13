"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CMSManager, { ProfilePhotoManager, MediaLibrary } from "./CMSManager";
import SubmissionInbox from "./SubmissionInbox";
import VisitorStatistics from "./VisitorStatistics";
import definitions from "../shared/cms-fields.json";
import "./admin.css";
async function api(path, options = {}) {
  const canRetry = !options.method || options.method === "GET";
  for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt++) {
    let response;
    try {
      response = await fetch("/api" + path, {
        ...options,
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Request": "1",
          ...options.headers,
        },
      });
    } catch (error) {
      if (canRetry && attempt === 0 && error instanceof TypeError) continue;
      throw error;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (
        canRetry &&
        attempt === 0 &&
        [502, 503, 504].includes(response.status)
      )
        continue;
      const error = new Error(
        body?.message || "The admin service is unavailable. Please try again.",
      );
      error.status = response.status;
      error.fields = body?.errors;
      throw error;
    }
    return body;
  }
}
const tabs = [
  ["dashboard", "Dashboard", "fa-gauge-high"],
  ["navigation", "Navigation", "fa-compass"],
  ["profile", "Profile", "fa-user"],
  ["about", "About", "fa-address-card"],
  ["contactInfo", "Contact information", "fa-address-book"],
  ["photo", "Profile DP", "fa-camera"],
  ["services", "Services", "fa-laptop-code"],
  ["projects", "Projects", "fa-code"],
  ["skills", "Skills", "fa-layer-group"],
  ["experience", "Experience", "fa-briefcase"],
  ["education", "Education", "fa-graduation-cap"],
  ["gallery", "Gallery", "fa-images"],
  ["socialLinks", "Social links", "fa-link"],
  ["messages", "Messages", "fa-envelope"],
  ["inquiries", "Inquiries", "fa-handshake"],
  ["analytics", "Visitors", "fa-chart-bar"],
  ["settings", "Settings", "fa-gear"],
  ["sections", "Section order", "fa-list"],
  ["media", "Image library", "fa-photo-film"],
];
export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cms, setCms] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState({ configured: false });
  const [overview, setOverview] = useState({
    messages: 0,
    unread: 0,
    inquiries: 0,
    newInquiries: 0,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ error: false, text: "" });
  const handleError = useCallback((error) => {
    if (error.status === 401) {
      setSession(null);
      setCms(null);
    }
    setNotice({
      error: true,
      text:
        error.name === "TimeoutError" || error instanceof TypeError
          ? "Unable to reach the server. Please try again."
          : error.message,
    });
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [content, inbox, clients, visits, mail, summary] =
        await Promise.all([
          api("/admin/cms"),
          api("/admin/messages"),
          api("/admin/inquiries"),
          api("/admin/analytics"),
          api("/admin/notifications/status"),
          api("/admin/overview"),
        ]);
      setCms(content);
      setMessages(inbox);
      setInquiries(clients);
      setAnalytics(visits);
      setNotifications(mail);
      setOverview(summary);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api("/admin/session")
      .then(async (user) => {
        if (active) {
          setSession(user);
          await refresh();
        }
      })
      .catch((error) => {
        if (active && error.status !== 401) handleError(error);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, handleError]);
  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    setNotice({ error: false, text: "" });
    try {
      await action();
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("portfolio-content");
        channel.postMessage("updated");
        channel.close();
      }
      if (success) setNotice({ error: false, text: success });
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }
  function login(event) {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      const user = await api("/admin/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setSession(user);
      await refresh();
    });
  }
  const noticeView = (
    <p
      className={"admin-notice" + (notice.error ? " is-error" : "")}
      role="status"
      aria-live="polite"
    >
      {notice.text}
    </p>
  );
  if (checking)
    return (
      <div className="admin-page admin-login">
        <p role="status">Loading admin panel?</p>
      </div>
    );
  if (!session)
    return (
      <div className="admin-page admin-login">
        <div className="admin-login-card">
          <div className="admin-brand">
            <i className="fas fa-layer-group" aria-hidden="true" /> Portfolio
            Admin
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to manage your portfolio and contact messages.</p>
          <form onSubmit={login}>
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              name="username"
              autoComplete="username"
              required
              maxLength={100}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
            <button className="admin-primary" disabled={busy}>
              {busy ? "Signing in?" : "Sign in"}
            </button>
          </form>
          {noticeView}
          <Link href="/" className="admin-back">
            ? Back to portfolio
          </Link>
        </div>
      </div>
    );
  const current = tabs.find((item) => item[0] === tab);
  const counts = [
    ["Projects", cms?.projects?.length || 0, "fa-code"],
    ["Services", cms?.services?.length || 0, "fa-laptop-code"],
    ["Skills", cms?.skills?.length || 0, "fa-layer-group"],
    ["Gallery items", cms?.gallery?.length || 0, "fa-images"],
    ["Experience", cms?.experience?.length || 0, "fa-briefcase"],
    ["Education", cms?.education?.length || 0, "fa-graduation-cap"],
    ["Messages", overview.messages, "fa-envelope"],
    ["Inquiries", overview.inquiries, "fa-handshake"],
  ];
  function recent(label, records, title, key) {
    return (
      <article className="admin-project">
        <div className="admin-section-heading">
          <h3>{label}</h3>
          <button onClick={() => setTab(key)}>View all</button>
        </div>
        {records.length ? (
          records
            .toSorted(
              (a, b) =>
                new Date(b.createdAt || b.updatedAt || 0) -
                new Date(a.createdAt || a.updatedAt || 0),
            )
            .slice(0, 4)
            .map((record) => (
              <div className="cms-recent-item" key={record.id}>
                <strong>{record[title]}</strong>
                <span>
                  {record.status ||
                    record.subject ||
                    record.category ||
                    "Saved content"}
                </span>
                {(record.createdAt || record.updatedAt) && (
                  <time>
                    {new Date(
                      record.createdAt || record.updatedAt,
                    ).toLocaleDateString()}
                  </time>
                )}
              </div>
            ))
        ) : (
          <p className="admin-form-help">No {label.toLowerCase()} yet.</p>
        )}
      </article>
    );
  }
  return (
    <div className="admin-page admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <i className="fas fa-layer-group" aria-hidden="true" /> Portfolio
          Admin
        </div>
        <button
          className="admin-menu-button"
          aria-controls="admin-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "Close admin navigation" : "Open admin navigation"}
        </button>
        <p className="admin-sidebar-label">YOUR WORKSPACE</p>
        <div
          id="admin-navigation"
          className={"admin-tabs" + (menuOpen ? " is-open" : "")}
          role="tablist"
          aria-label="Admin sections"
        >
          {tabs.map(([key, label, icon]) => (
            <button
              key={key}
              id={key + "-tab"}
              role="tab"
              aria-controls="admin-content"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setMenuOpen(false);
                setNotice({ error: false, text: "" });
              }}
            >
              <i className={"fas " + icon} aria-hidden="true" />
              {label}
              {key === "messages" && <span>{overview.unread}</span>}
              {key === "inquiries" && <span>{overview.newInquiries}</span>}
            </button>
          ))}
        </div>
        <Link href="/" className="admin-back">
          ? View portfolio
        </Link>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">
              WORKSPACE / {current[1].toUpperCase()}
            </p>
            <h1>{current[1]}</h1>
          </div>
          <div className="admin-account">
            <span>{session.username}</span>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/admin/logout", { method: "POST" });
                  setSession(null);
                  setCms(null);
                  setMessages([]);
                  setInquiries([]);
                })
              }
            >
              Sign out
            </button>
          </div>
        </div>
        {noticeView}
        {!notifications.configured && (
          <p className="admin-configuration-note">
            Submissions are saved. Email notifications need your SMTP host and
            credentials in the backend environment.
          </p>
        )}
        <div className="admin-section-heading">
          <h2>
            {tab === "dashboard"
              ? "Portfolio overview"
              : tab === "analytics"
                ? "Visitor statistics"
                : tab === "photo"
                  ? "Manage profile photo"
                  : current[1]}
          </h2>
          <button
            disabled={busy || loading}
            onClick={() => run(refresh, "Content refreshed.")}
          >
            {loading ? "Loading?" : busy ? "Working?" : "Refresh"}
          </button>
        </div>
        <div
          id="admin-content"
          role="tabpanel"
          aria-labelledby={tab + "-tab"}
          aria-busy={loading}
        >
          {!cms ? (
            <div className="admin-empty">
              <p>
                {loading
                  ? "Loading portfolio content?"
                  : "Content could not be loaded. Use Refresh to try again."}
              </p>
            </div>
          ) : tab === "dashboard" ? (
            <>
              <div className="admin-stats">
                {counts.map(([label, value, icon]) => (
                  <div key={label}>
                    <i className={"fas " + icon} aria-hidden="true" />
                    <span>Total {label.toLowerCase()}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="cms-quick-actions">
                <h3>Quick actions</h3>
                <div className="admin-actions">
                  {[
                    "projects",
                    "services",
                    "skills",
                    "gallery",
                    "experience",
                    "education",
                  ].map((key) => (
                    <button key={key} onClick={() => setTab(key)}>
                      + Add{" "}
                      {key === "gallery"
                        ? "gallery item"
                        : key === "experience"
                          ? "experience"
                          : key === "education"
                            ? "education"
                            : key.slice(0, -1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cms-recent-grid">
                {recent("Recent messages", messages, "name", "messages")}
                {recent("Recent inquiries", inquiries, "name", "inquiries")}
                {recent("Recent projects", cms.projects, "title", "projects")}
                {recent(
                  "Recent gallery uploads",
                  cms.gallery,
                  "title",
                  "gallery",
                )}
              </div>
            </>
          ) : tab === "messages" || tab === "inquiries" ? (
            <SubmissionInbox
              key={tab}
              kind={tab === "messages" ? "contact" : "inquiry"}
              records={tab === "messages" ? messages : inquiries}
              busy={busy}
              run={run}
              refresh={refresh}
              request={api}
            />
          ) : tab === "analytics" ? (
            <VisitorStatistics analytics={analytics} />
          ) : tab === "photo" ? (
            <ProfilePhotoManager
              profile={cms.profile}
              busy={busy}
              run={run}
              refresh={refresh}
              request={api}
            />
          ) : tab === "media" ? (
            <MediaLibrary request={api} run={run} busy={busy} revision={cms} />
          ) : definitions[tab] ? (
            <CMSManager
              key={tab}
              kind={tab}
              content={cms[tab]}
              busy={busy}
              run={run}
              refresh={refresh}
              request={api}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

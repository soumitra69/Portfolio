"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SkillManager from "./SkillManager";
import ExperienceManager from "./ExperienceManager";
import ProfileManager from "./ProfileManager";
import defaultProfile from "../../shared/profile.json";
import "./admin.css";

const emptyProject = { title: "", description: "", image: "", demoUrl: "", githubUrl: "", technologies: "" };
const imagePaths = [
  "/assets/Digital_Marketing_Agency_Website_ (1).png",
  "/assets/soumitra69.github.io_Cryptocurrency_Price_Tracker_Website_.png",
  "/assets/CineFlix-A-stylish-movie-streaming-download-website_.png",
  "/assets/DSC_0068.JPG",
];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options, cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", "X-Admin-Request": "1", ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || (response.status >= 500
      ? "The admin service is unavailable. Please try again shortly."
      : "Request failed. Please try again."));
    error.status = response.status;
    throw error;
  }
  return body;
}

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  const [profile, setProfile] = useState(defaultProfile);
  const [tab, setTab] = useState("messages");
  const [notice, setNotice] = useState({ error: false, text: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProject);

  const handleError = useCallback((error) => {
    if (error.status === 401) setSession(null);
    setNotice({ error: true, text: error instanceof TypeError || error.name === "TimeoutError"
      ? "Unable to reach the server. Please try again." : error.message });
  }, []);

  const refresh = useCallback(async () => {
    const [inbox, portfolio, skillList, history, personal] = await Promise.all([api("/admin/messages"), api("/projects"), api("/skills"), api("/experience"), api("/profile")]);
    setMessages(inbox);
    setProjects(portfolio);
    setSkills(skillList);
    setExperience(history);
    setProfile(personal);
  }, []);

  useEffect(() => {
    let active = true;
    api("/admin/session")
      .then(async (user) => { if (active) { setSession(user); await refresh(); } })
      .catch((error) => { if (active && error.status !== 401) handleError(error); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [refresh, handleError]);

  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    setNotice({ error: false, text: "" });
    try {
      await action();
      if (success) setNotice({ error: false, text: success });
    } catch (error) { handleError(error); }
    finally { setBusy(false); }
  }

  function login(event) {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      const user = await api("/admin/login", { method: "POST", body: JSON.stringify(credentials) });
      setSession(user);
      await refresh();
    });
  }

  function editProject(project) {
    setEditing(project?.id || null);
    setProjectForm(project ? { ...project, technologies: project.technologies.join(", ") } : emptyProject);
  }

  function saveProject(event) {
    event.preventDefault();
    run(async () => {
      await api(`/admin/projects${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...projectForm, technologies: projectForm.technologies.split(",").map((tech) => tech.trim()).filter(Boolean) }),
      });
      editProject(null);
      await refresh();
    }, editing ? "Project updated." : "Project added.");
  }

  const noticeView = <p className={`admin-notice${notice.error ? " is-error" : ""}`} role="status" aria-live="polite">{notice.text}</p>;

  if (checking) return <div className="admin-page admin-login"><p role="status">Loading admin panel…</p></div>;

  if (!session) return (
    <div className="admin-page admin-login">
      <div className="admin-login-card">
        <div className="admin-brand"><i className="fas fa-layer-group" aria-hidden="true" /> Portfolio Admin</div>
        <h1>Welcome back</h1>
        <p>Sign in to manage your portfolio and contact messages.</p>
        <form onSubmit={login}>
          <label htmlFor="admin-username">Username</label>
          <input id="admin-username" name="username" autoComplete="username" required maxLength={100} />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
          <button className="admin-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        {noticeView}
        <Link href="/" className="admin-back">← Back to portfolio</Link>
      </div>
    </div>
  );

  return (
    <div className="admin-page admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand"><i className="fas fa-layer-group" aria-hidden="true" /> Portfolio Admin</div>
        <p className="admin-sidebar-label">WORKSPACE</p>
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          <button id="messages-tab" role="tab" aria-controls="admin-content" aria-selected={tab === "messages"} onClick={() => setTab("messages")}><i className="fas fa-envelope" aria-hidden="true" /> Messages <span>{messages.filter((item) => !item.read).length}</span></button>
          <button id="projects-tab" role="tab" aria-controls="admin-content" aria-selected={tab === "projects"} onClick={() => setTab("projects")}><i className="fas fa-code" aria-hidden="true" /> Projects</button>
          <button id="skills-tab" role="tab" aria-controls="admin-content" aria-selected={tab === "skills"} onClick={() => setTab("skills")}><i className="fas fa-layer-group" aria-hidden="true" /> Skills</button>
          <button id="experience-tab" role="tab" aria-controls="admin-content" aria-selected={tab === "experience"} onClick={() => setTab("experience")}><i className="fas fa-briefcase" aria-hidden="true" /> Experience</button>
          <button id="profile-tab" role="tab" aria-controls="admin-content" aria-selected={tab === "profile"} onClick={() => setTab("profile")}><i className="fas fa-user-circle" aria-hidden="true" /> Profile</button>
        </div>
        <Link href="/" className="admin-back">← View portfolio</Link>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div><p className="admin-eyebrow">YOUR PORTFOLIO, AT A GLANCE</p><h1>Dashboard</h1></div>
          <div className="admin-account"><span>{session.username}</span><button disabled={busy} onClick={() => run(async () => { await api("/admin/logout", { method: "POST" }); setSession(null); setMessages([]); setProjects([]); })}>Sign out</button></div>
        </div>
        <div className="admin-stats">
          <div><span>Total messages</span><strong>{messages.length}</strong></div>
          <div><span>Unread messages</span><strong>{messages.filter((item) => !item.read).length}</strong></div>
          <div><span>Portfolio projects</span><strong>{projects.length}</strong></div>
        </div>
        {noticeView}
        <div className="admin-section-heading"><h2>{{ messages: "Contact messages", projects: "Manage projects", skills: "Manage skills", experience: "Manage experience", profile: "Profile photo" }[tab]}</h2><button disabled={busy} onClick={() => run(refresh, "Dashboard refreshed.")}>{busy ? "Working…" : "Refresh"}</button></div>
        <div id="admin-content" role="tabpanel" aria-labelledby={`${tab}-tab`}>
          {tab === "messages" ? (
            <div className="admin-message-list">
              {!messages.length && <div className="admin-empty"><i className="far fa-envelope" aria-hidden="true" /><h3>Your inbox is clear</h3><p>Messages submitted through your portfolio will appear here.</p></div>}
              {messages.map((message) => (
                <article className={`admin-message${message.read ? "" : " unread"}`} key={message.id}>
                  <div className="admin-message-heading"><div><h3>{message.name} {!message.read && <span className="admin-badge">New</span>}</h3><a href={`mailto:${message.email}`}>{message.email}</a></div><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></div>
                  <p className="admin-message-body">{message.message}</p>
                  <div className="admin-actions">
                    <button disabled={busy} onClick={() => run(async () => { await api(`/admin/messages/${message.id}`, { method: "PATCH", body: JSON.stringify({ read: !message.read }) }); await refresh(); })}>Mark as {message.read ? "unread" : "read"}</button>
                    <a href={`mailto:${message.email}`}>Reply by email</a>
                    <button className="admin-danger" disabled={busy} onClick={() => { if (window.confirm("Delete this message permanently?")) run(async () => { await api(`/admin/messages/${message.id}`, { method: "DELETE" }); await refresh(); }, "Message deleted."); }}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : tab === "skills" ? (
            <SkillManager skills={skills} busy={busy} run={run} refresh={refresh} request={api} />
          ) : tab === "experience" ? (
            <ExperienceManager experience={experience} busy={busy} run={run} refresh={refresh} request={api} />
          ) : tab === "profile" ? (
            <ProfileManager profile={profile} busy={busy} run={run} refresh={refresh} request={api} />
          ) : (
            <div className="admin-project-layout">
              <div className="admin-project-list">
                {!projects.length && <p className="admin-empty">Add your first project using the form.</p>}
                {projects.map((project) => <article className="admin-project" key={project.id}><h3>{project.title}</h3><p>{project.description}</p><div className="admin-actions"><button disabled={busy} onClick={() => editProject(project)}>Edit</button><a href={project.demoUrl} target="_blank" rel="noopener noreferrer">View demo</a><button className="admin-danger" disabled={busy} onClick={() => { if (window.confirm(`Delete "${project.title}" from your portfolio?`)) run(async () => { await api(`/admin/projects/${project.id}`, { method: "DELETE" }); if (editing === project.id) editProject(null); await refresh(); }, "Project deleted."); }}>Delete</button></div></article>)}
              </div>
              <form className="admin-project-form" onSubmit={saveProject}>
                <h3>{editing ? "Edit project" : "Add a project"}</h3>
                {[
                  ["title", "Project title", "text", 150],
                  ["description", "Description", "textarea", 2000],
                  ["image", "Image path", "text", 250],
                  ["demoUrl", "Live demo URL", "url", 2000],
                  ["githubUrl", "GitHub URL", "url", 2000],
                  ["technologies", "Technologies (comma separated)", "text", 400],
                ].map(([field, label, type, maxLength]) => <div key={field}><label htmlFor={`project-${field}`}>{label}</label>{type === "textarea" ? <textarea id={`project-${field}`} rows={4} required maxLength={maxLength} value={projectForm[field]} onChange={(event) => setProjectForm({ ...projectForm, [field]: event.target.value })} /> : <input id={`project-${field}`} type={type} list={field === "image" ? "project-images" : undefined} placeholder={field === "image" ? "/assets/your-image.png" : undefined} required maxLength={maxLength} value={projectForm[field]} onChange={(event) => setProjectForm({ ...projectForm, [field]: event.target.value })} />}</div>)}
                <datalist id="project-images">{imagePaths.map((path) => <option key={path} value={path} />)}</datalist>
                <p className="admin-form-help">Choose an existing image path, or add an image to the portfolio assets folder first.</p>
                <div className="admin-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add project"}</button>{editing && <button type="button" disabled={busy} onClick={() => editProject(null)}>Cancel edit</button>}</div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

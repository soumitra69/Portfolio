"use client";

import { useState } from "react";

const statuses = ["New", "Contacted", "In Progress", "Completed", "Rejected"];

export default function SubmissionInbox({ kind, records, busy, run, refresh, request }) {
  const [extra, setExtra] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(records.length === 50);
  const [expanded, setExpanded] = useState(null);
  const path = kind === "contact" ? "messages" : "inquiries";
  // Refresh replaces the first page; extra records are cleared after mutations.
  const all = [...records, ...extra].filter((record, index, list) => list.findIndex((item) => item.id === record.id) === index);
  async function reload() { setExtra([]); setPage(1); setHasMore(true); await refresh(); }
  function loadMore() {
    run(async () => { const next = await request(`/admin/${path}?page=${page + 1}&limit=50`); setExtra((items) => [...items, ...next]); setPage(page + 1); setHasMore(next.length === 50); });
  }
  return <div className="admin-message-list">
    {!all.length && <div className="admin-empty"><i className={`far ${kind === "contact" ? "fa-envelope" : "fa-handshake"}`} aria-hidden="true" /><h3>{kind === "contact" ? "Your inbox is clear" : "No project inquiries yet"}</h3><p>Submissions from the Contact section will appear here.</p></div>}
    {all.map((record) => <article className={`admin-message${kind === "contact" && !record.read ? " unread" : ""}`} key={record.id}>
      <div className="admin-message-heading"><div><h3>{record.name} {(kind === "contact" ? !record.read : record.status === "New") && <span className="admin-badge">New</span>}</h3><a href={`mailto:${record.email}`}>{record.email}</a></div><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time></div>
      <h4 className="admin-submission-subject">{kind === "contact" ? record.subject || "General message" : record.projectType}</h4>
      <p className="admin-message-body">{record.message}</p>
      {kind === "inquiry" && <div className="inquiry-status"><label htmlFor={`status-${record.id}`}>Inquiry status</label><select id={`status-${record.id}`} disabled={busy} value={record.status} onChange={(event) => run(async () => { await request(`/admin/inquiries/${record.id}`, { method: "PATCH", body: JSON.stringify({ status: event.target.value }) }); await reload(); }, "Inquiry status updated.")}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>}
      <div className="admin-actions">
        {kind === "contact" && <button disabled={busy} onClick={() => run(async () => { await request(`/admin/messages/${record.id}`, { method: "PATCH", body: JSON.stringify({ read: !record.read }) }); await reload(); })}>Mark as {record.read ? "unread" : "read"}</button>}
        <a href={`mailto:${record.email}?subject=${encodeURIComponent(`Re: ${record.subject || record.projectType || "Your message"}`)}`}>Reply by email</a>
        <button aria-expanded={expanded === record.id} aria-controls={`details-${record.id}`} onClick={() => setExpanded(expanded === record.id ? null : record.id)}>Details</button>
        <button className="admin-danger" disabled={busy} onClick={() => { if (window.confirm("Delete this submission permanently?")) run(async () => { await request(`/admin/${path}/${record.id}`, { method: "DELETE" }); await reload(); }, "Submission deleted."); }}>Delete</button>
      </div>
      {expanded === record.id && <dl id={`details-${record.id}`} className="submission-details">
        <div><dt>Submission ID</dt><dd>{record.id}</dd></div>
        {kind === "inquiry" && <div><dt>Company</dt><dd>{record.company || "Not provided"}</dd></div>}
        <div><dt>Email notification</dt><dd>{{ sent: "Sent to owner", pending: "Pending", failed: "Delivery failed", disabled: "SMTP is not configured" }[record.notification] || "Not recorded"}</dd></div>
        {["failed", "disabled"].includes(record.notification) && <button disabled={busy} onClick={() => run(async () => { await request(`/admin/${path}/${record.id}/notification`, { method: "POST" }); await reload(); }, "Owner notification sent.")}>Retry notification</button>}
      </dl>}
    </article>)}
    {all.length >= 50 && hasMore && <button className="admin-load-more" disabled={busy} onClick={loadMore}>Load more submissions</button>}
  </div>;
}

"use client";

import { useState } from "react";
import employmentTypes from "../shared/employment-types.json";
import { formatMonth } from "../shared/format-month.js";

const emptyExperience = { company: "", role: "", employmentType: "Full-time", startDate: "", endDate: "", current: false, description: "" };

export default function ExperienceManager({ experience, busy, run, refresh, request }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExperience);
  const update = (field, value) => setForm({ ...form, [field]: value });

  function edit(item) {
    setEditing(item?.id || null);
    setForm(item ? { ...item } : emptyExperience);
  }
  function save(event) {
    event.preventDefault();
    run(async () => {
      await request(`/admin/experience${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST", body: JSON.stringify(form),
      });
      edit(null);
      await refresh();
    }, editing ? "Experience updated." : "Experience added.");
  }
  function remove(item) {
    if (!window.confirm(`Delete your experience at "${item.company}"?`)) return;
    run(async () => {
      await request(`/admin/experience/${item.id}`, { method: "DELETE" });
      if (editing === item.id) edit(null);
      await refresh();
    }, "Experience deleted.");
  }

  return (
    <div className="admin-project-layout">
      <div className="admin-project-list">
        {!experience.length && <div className="admin-empty"><i className="fas fa-briefcase" aria-hidden="true" /><h3>No experience added yet</h3><p>Add your internships and employment history using the form.</p></div>}
        {experience.map((item) => <article className="admin-project" key={item.id}>
          <h3>{item.role}</h3><p className="admin-experience-company">{item.company} <span className="admin-badge">{item.employmentType}</span></p>
          <p>{formatMonth(item.startDate)} – {item.current ? "Present" : formatMonth(item.endDate)}</p>
          {item.description && <p className="admin-experience-description">{item.description}</p>}
          <div className="admin-actions"><button disabled={busy} onClick={() => edit(item)}>Edit</button><button className="admin-danger" disabled={busy} onClick={() => remove(item)}>Delete</button></div>
        </article>)}
      </div>
      <form className="admin-project-form" onSubmit={save}>
        <h3>{editing ? "Edit Experience" : "Add Experience"}</h3>
        <label htmlFor="experience-company">Company name</label>
        <input id="experience-company" required maxLength={120} value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="e.g. Acme Technologies" />
        <label htmlFor="experience-role">Job title / role</label>
        <input id="experience-role" required maxLength={120} value={form.role} onChange={(event) => update("role", event.target.value)} placeholder="e.g. Frontend Developer" />
        <label htmlFor="experience-type">Employment type</label>
        <select id="experience-type" value={form.employmentType} onChange={(event) => update("employmentType", event.target.value)}>{employmentTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <label htmlFor="experience-start">Joining date</label>
        <input id="experience-start" type="month" required min="1900-01" max="2199-12" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} />
        <label htmlFor="experience-present" className="admin-checkbox"><input id="experience-present" type="checkbox" checked={form.current}
          onChange={(event) => setForm({ ...form, current: event.target.checked, endDate: "" })} /> I currently work here (Present)</label>
        <label htmlFor="experience-end">End date</label>
        <input id="experience-end" type="month" required={!form.current} disabled={form.current} min={form.startDate || "1900-01"} max="2199-12"
          value={form.endDate} onChange={(event) => update("endDate", event.target.value)} />
        <label htmlFor="experience-description">Description (optional)</label>
        <textarea id="experience-description" rows={4} maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Your responsibilities and achievements" />
        <div className="admin-actions"><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save Experience" : "Add Experience"}</button>
          {editing && <button type="button" disabled={busy} onClick={() => edit(null)}>Cancel edit</button>}</div>
      </form>
    </div>
  );
}

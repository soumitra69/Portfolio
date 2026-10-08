"use client";

import { useState } from "react";
import skillIcons from "../shared/skill-icons.json";

const emptySkill = { name: "", icon: "fa-solid fa-code" };

export default function SkillManager({ skills, busy, run, refresh, request }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySkill);

  function edit(skill) {
    setEditing(skill?.id || null);
    setForm(skill ? { name: skill.name, icon: skill.icon } : emptySkill);
  }

  function save(event) {
    event.preventDefault();
    run(async () => {
      await request(`/admin/skills${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      edit(null);
      await refresh();
    }, editing ? "Skill updated." : "Skill added.");
  }

  function remove(skill) {
    if (!window.confirm(`Delete "${skill.name}" from your portfolio?`)) return;
    run(async () => {
      await request(`/admin/skills/${skill.id}`, { method: "DELETE" });
      if (editing === skill.id) edit(null);
      await refresh();
    }, "Skill deleted.");
  }

  return (
    <div className="admin-project-layout">
      <div className="admin-project-list">
        {!skills.length && <div className="admin-empty"><h3>No skills yet</h3><p>Add your first skill using the form.</p></div>}
        {skills.map((skill) => (
          <article className="admin-project admin-skill" key={skill.id}>
            <div className="admin-skill-name"><i className={skill.icon} aria-hidden="true" /><h3>{skill.name}</h3></div>
            <div className="admin-actions">
              <button disabled={busy} onClick={() => edit(skill)}>Edit</button>
              <button className="admin-danger" disabled={busy} onClick={() => remove(skill)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      <form className="admin-project-form" onSubmit={save}>
        <h3>{editing ? "Edit Skill" : "Add Skill"}</h3>
        <label htmlFor="skill-name">Skill name</label>
        <input id="skill-name" placeholder="e.g. Node.js" required maxLength={60} value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <label htmlFor="skill-icon">Skill icon</label>
        <select id="skill-icon" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
          {skillIcons.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
        </select>
        <div className="admin-skill-preview"><i className={form.icon} aria-hidden="true" /><span>{form.name.trim() || "Your skill"}</span></div>
        <p className="admin-form-help">Saved skills appear in the About section of your portfolio.</p>
        <div className="admin-actions">
          <button className="admin-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save Skill" : "Add Skill"}</button>
          {editing && <button type="button" disabled={busy} onClick={() => edit(null)}>Cancel edit</button>}
        </div>
      </form>
    </div>
  );
}

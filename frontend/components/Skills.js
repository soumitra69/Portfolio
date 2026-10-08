"use client";

import { useEffect, useState } from "react";

export default function Skills({ initialSkills }) {
  const [skills, setSkills] = useState(initialSkills);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skills", { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Skills unavailable"); return response.json(); })
      .then(setSkills)
      .catch(() => { /* Keep the original skills available while the API is offline. */ });
    return () => controller.abort();
  }, []);

  return (
    <div className="skills-grid">
      {skills.map((skill) => (
        <div className="skill-item" key={skill.id}>
          <i className={skill.icon} aria-hidden="true" />
          <p>{skill.name}</p>
        </div>
      ))}
      {!skills.length && <p>New skills are coming soon.</p>}
    </div>
  );
}

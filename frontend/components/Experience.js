"use client";

import { useEffect, useState } from "react";
import { formatMonth } from "../shared/format-month.js";

export default function Experience() {
  const [experience, setExperience] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/experience", { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Experience unavailable"); return response.json(); })
      .then(setExperience).catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="experience-list">
      {!experience.length && <p className="experience-empty">Experience details are coming soon.</p>}
      {experience.map((item) => (
        <article className="experience-card" key={item.id}>
          <div className="experience-icon"><i className="fas fa-briefcase" aria-hidden="true" /></div>
          <div className="experience-details">
            <div className="experience-heading"><h3>{item.role}</h3><span className="tech-tag">{item.employmentType}</span></div>
            <p className="experience-company">{item.company}</p>
            <p className="experience-dates"><time dateTime={item.startDate}>{formatMonth(item.startDate)}</time> – {item.current ? <span className="experience-present">Present</span> : <time dateTime={item.endDate}>{formatMonth(item.endDate)}</time>}</p>
            {item.description && <p className="experience-description">{item.description}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

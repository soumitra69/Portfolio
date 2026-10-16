"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { imageProps } from "../shared/image-assets.mjs";

export default function Projects({ initialProjects }) {
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/projects", { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Projects unavailable"); return response.json(); })
      .then(setProjects)
      .catch(() => { /* Keep the original portfolio available if the API is offline. */ });
    return () => controller.abort();
  }, []);

  return (
    <div className="projects-grid">
      {projects.map((project) => (
        <article className="project-card" key={project.id}>
          <Image {...imageProps(project.image, 1200, 675)} alt={`${project.title} website interface preview`} className="project-image" loading="lazy" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px" />
          <div className="project-content">
            <h3 className="project-title">{project.title}</h3>
            <p className="project-description">{project.description}</p>
            <div className="project-tech">
              {project.technologies.map((tech, index) => <span className="tech-tag" key={`${tech}-${index}`}>{tech}</span>)}
            </div>
            <div className="project-links">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"><i className="fas fa-external-link-alt" aria-hidden="true" /> View {project.title} project</a>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"><i className="fab fa-github" aria-hidden="true" /> {project.title} source code</a>
            </div>
          </div>
        </article>
      ))}
      {!projects.length && <p>New projects are coming soon.</p>}
    </div>
  );
}

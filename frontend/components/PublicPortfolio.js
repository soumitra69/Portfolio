"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Header from "./Header";
import ContactForm from "./ContactForm";
import SectionAnimations from "./SectionAnimations";
import VisitorAnalytics from "./VisitorAnalytics";
import DepthCard from "./DepthCard";
import { formatMonth } from "../shared/format-month";
const HeroScene = dynamic(() => import("./HeroScene"));
const Gallery = dynamic(() => import("./Gallery"), {
  loading: () => <p role="status">Loading gallery...</p>,
});
const photoProps = (url) => ({
  unoptimized: url.startsWith("/api/") || url.startsWith("https://"),
});

export default function PublicPortfolio({
  initialContent,
  analyticsEnabled,
  resumeUrl = "",
}) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialContent);
  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/content", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw Error("Unable to load portfolio content. Please try again.");
      const next = await response.json();
      if (!next.profile || !next.settings || !Array.isArray(next.sections))
        throw Error("Invalid portfolio content");
      setContent((current) =>
        next.availability === "offline" && current && !current.isStatic
          ? { ...current, availability: "offline" }
          : next,
      );
      setError("");
    } catch {
      setError("Unable to load portfolio content. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!initialContent || initialContent.availability === "offline") reload();
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const updates =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("portfolio-content")
        : null;
    if (updates) updates.onmessage = refresh;
    const interval = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(interval);
      updates?.close();
    };
  }, [initialContent, reload]);
  useEffect(() => {
    if (!content) return;
    document.documentElement.style.setProperty(
      "--primary-color",
      content.settings.primaryColor,
    );
    document.documentElement.dataset.motion = content.settings.animationsEnabled
      ? "on"
      : "off";
    try {
      if (!localStorage.getItem("portfolio-theme"))
        document.documentElement.dataset.theme =
          content.settings.theme === "system"
            ? matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : content.settings.theme;
    } catch {}
  }, [content]);
  if (!content)
    return (
      <main className="portfolio-loading" aria-busy={loading}>
        <h1>
          {loading
            ? "Loading portfolio..."
            : "Portfolio temporarily unavailable"}
        </h1>
        {loading ? (
          <div className="portfolio-skeleton" />
        ) : (
          <>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setLoading(true);
                reload();
              }}
            >
              Try again
            </button>
          </>
        )}
      </main>
    );
  const { profile, about, contactInfo, settings, sections } = content;
  const offline = content.availability === "offline";
  const tilt = settings.animationsEnabled && settings.tiltEnabled;
  const tags = (items = []) => (
    <div className="project-tech">
      {items.map((item, index) => (
        <span className="tech-tag" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
    </div>
  );
  const empty = (text, icon) => (
    <div className="portfolio-empty">
      <i className={icon} aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
  const socials = (
    <div className="social-links">
      {content.socialLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          aria-label={link.name}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className={link.icon || "fas fa-link"} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
  function sectionContent(key) {
    if (key === "home")
      return (
        <div className="hero-content">
          <div className="hero-text fade-in-up">
            <p className="hero-eyebrow">
              <span />
              DESIGN. DEVELOP. MAKE IT MATTER.
            </p>
            <h1>
              <span className="hero-greeting">{profile.greeting} </span>
              <span className="hero-name">{profile.name}</span>
            </h1>
            <h2 className="hero-role">{profile.title}</h2>
            <p className="hero-description">{profile.shortIntroduction}</p>
            <div className="cta-buttons">
              <a href={profile.primaryCtaUrl} className="btn btn-primary">
                <i
                  className="fas fa-arrow-up-right-from-square"
                  aria-hidden="true"
                />
                {profile.primaryCtaText}
              </a>
              {profile.secondaryCtaText && (
                <a href={profile.secondaryCtaUrl} className="btn btn-secondary">
                  <i className="fas fa-envelope" aria-hidden="true" />
                  {profile.secondaryCtaText}
                </a>
              )}
              <a
                href={resumeUrl || "#contact"}
                className="btn btn-resume"
                {...(resumeUrl
                  ? {
                      download: true,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {})}
              >
                <i
                  className={`fas fa-${resumeUrl ? "download" : "file-lines"}`}
                  aria-hidden="true"
                />
                {resumeUrl ? "Download Resume" : "Request Resume"}
              </a>
            </div>
            <div className="hero-socials">
              {socials}
              <span className="hero-social-caption">
                Let&apos;s connect and build something.
              </span>
            </div>
            <a className="scroll-cue" href="#about">
              <span />
              Scroll to explore
              <i className="fas fa-arrow-down" aria-hidden="true" />
            </a>
          </div>
          <div className="hero-visual">
            <HeroScene
              enabled={settings.animationsEnabled}
              name={profile.name}
            />
            {profile.photoUrl && profile.photoVisible && (
              <div className="developer-badge">
                <Image
                  className="profile-img"
                  src={profile.photoUrl}
                  alt={profile.name}
                  width={54}
                  height={54}
                  sizes="54px"
                  {...photoProps(profile.photoUrl)}
                />
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.title}</span>
                </div>
                <i className="fas fa-code" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      );
    if (key === "about")
      return (
        <div className="about-content">
          <DepthCard className="about-text glass-panel" enabled={tilt}>
            <span className="content-kicker">THE PERSON BEHIND THE CODE</span>
            <p>{about.shortIntroduction}</p>
            <p>{about.longDescription}</p>
            {profile.longIntroduction && <p>{profile.longIntroduction}</p>}
            {profile.information && <p>{profile.information}</p>}
            {about.highlights.length > 0 && (
              <ul className="about-highlights">
                {about.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {about.additionalInformation && (
              <p>{about.additionalInformation}</p>
            )}
          </DepthCard>
          <div className="about-details">
            <DepthCard className="about-toolkit glass-panel" enabled={tilt}>
              <i className="fas fa-cubes" aria-hidden="true" />
              <h3>My toolkit</h3>
              <p>The technologies behind my work.</p>
              {tags(content.skills.map((skill) => skill.name))}
            </DepthCard>
            <DepthCard className="about-work glass-panel" enabled={tilt}>
              <span className="about-project-count">
                {String(content.projects.length).padStart(2, "0")}
                <span>projects to explore</span>
              </span>
              <a href="#projects">
                Explore my work
                <i
                  className="fas fa-arrow-up-right-from-square"
                  aria-hidden="true"
                />
              </a>
            </DepthCard>
          </div>
        </div>
      );
    if (key === "skills") {
      const groups = [
        ...new Set(
          content.skills.map((item) => item.category || "Technologies"),
        ),
      ];
      return content.skills.length
        ? groups.map((group) => (
            <div className="skill-group" key={group}>
              {groups.length > 1 && <h3>{group}</h3>}
              <div className="skills-grid">
                {content.skills
                  .filter((item) => (item.category || "Technologies") === group)
                  .map((skill) => (
                    <DepthCard
                      enabled={tilt}
                      className="skill-item"
                      key={skill.id}
                    >
                      <i className={skill.icon} aria-hidden="true" />
                      <p>{skill.name}</p>
                      <span className="skill-caption">
                        {skill.category || "Technology"}
                      </span>
                      {Number.isFinite(skill.level) && (
                        <div
                          className="skill-level"
                          role="meter"
                          aria-label={`${skill.name} proficiency`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={skill.level}
                        >
                          <span style={{ width: `${skill.level}%` }} />
                        </div>
                      )}
                    </DepthCard>
                  ))}
              </div>
            </div>
          ))
        : empty("No skills have been added yet.", "fas fa-code");
    }
    if (key === "projects")
      return content.projects.length ? (
        <div className="projects-grid">
          {content.projects.map((project, index) => (
            <DepthCard
              as="article"
              enabled={tilt}
              className="project-card"
              key={project.id}
            >
              <div className="project-visual">
                <Image
                  src={project.image}
                  alt={`${project.title} preview`}
                  width={1200}
                  height={675}
                  className="project-image"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  {...photoProps(project.image)}
                />
                {project.featured && (
                  <span className="featured-label">Featured</span>
                )}
              </div>
              <div className="project-content">
                <span className="project-index">
                  PROJECT / {String(index + 1).padStart(2, "0")}
                </span>
                {project.category && (
                  <span className="content-kicker">{project.category}</span>
                )}
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>
                {tags(project.technologies)}
                <div className="project-links">
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i
                      className="fas fa-arrow-up-right-from-square"
                      aria-hidden="true"
                    />
                    Live Demo
                  </a>
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fab fa-github" aria-hidden="true" />
                    GitHub
                  </a>
                </div>
              </div>
            </DepthCard>
          ))}
        </div>
      ) : (
        empty("No projects have been added yet.", "fas fa-layer-group")
      );
    if (key === "services")
      return content.services.length ? (
        <div className="services-grid">
          {content.services.map((service) => (
            <DepthCard
              as="article"
              enabled={tilt}
              className="service-card"
              key={service.id}
            >
              <i className={service.icon || "fas fa-code"} aria-hidden="true" />
              {service.image && (
                <Image
                  src={service.image}
                  width={700}
                  height={400}
                  alt={service.title}
                  {...photoProps(service.image)}
                />
              )}
              <h3>{service.title}</h3>
              <p>{service.shortDescription}</p>
              {service.description && (
                <details>
                  <summary>More details</summary>
                  <p>{service.description}</p>
                </details>
              )}
              {service.features?.length > 0 && (
                <ul>
                  {service.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
              {tags(service.technologies)}
              {service.price && (
                <p className="service-price">{service.price}</p>
              )}
              {service.ctaText && (
                <a
                  className="btn btn-secondary"
                  href={service.ctaUrl || "#contact"}
                  data-contact-mode="inquiry"
                >
                  {service.ctaText}
                </a>
              )}
            </DepthCard>
          ))}
        </div>
      ) : (
        empty("Services will appear here when added.", "fas fa-laptop-code")
      );
    if (key === "experience")
      return content.experience.length ? (
        <div className="experience-list">
          {content.experience.map((item) => (
            <article className="experience-card" key={item.id}>
              <div className="experience-icon">
                <i className="fas fa-briefcase" aria-hidden="true" />
              </div>
              <div className="experience-details">
                <div className="experience-heading">
                  <h3>{item.role}</h3>
                  <span className="tech-tag">{item.employmentType}</span>
                </div>
                <p className="experience-company">
                  {item.companyUrl ? (
                    <a
                      href={item.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.company}
                    </a>
                  ) : (
                    item.company
                  )}
                </p>
                <p className="experience-dates">
                  {formatMonth(item.startDate)} –{" "}
                  {item.current ? "Present" : formatMonth(item.endDate)}
                  {item.location && ` · ${item.location}`}
                </p>
                <p className="experience-description">{item.description}</p>
                {tags(item.technologies)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        empty("No experience has been added yet.", "fas fa-briefcase")
      );
    if (key === "education")
      return content.education.length ? (
        <div className="experience-list">
          {content.education.map((item) => (
            <article className="experience-card" key={item.id}>
              <div className="experience-icon">
                <i className="fas fa-graduation-cap" aria-hidden="true" />
              </div>
              <div className="experience-details">
                <h3>{item.degree}</h3>
                <p className="experience-company">{item.institution}</p>
                <p>{item.course}</p>
                <p className="experience-dates">
                  {item.startYear} – {item.endYear || "Present"}
                  {item.location && ` · ${item.location}`}
                </p>
                <p className="experience-description">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        empty("No education has been added yet.", "fas fa-graduation-cap")
      );
    if (key === "gallery") return <Gallery items={content.gallery} />;
    if (key === "contact")
      return (
        <div className="contact-content">
          <div className="contact-info">
            <h3>
              <a href="#contact-form" data-contact-mode="inquiry">
                {contactInfo.ctaText}
              </a>
            </h3>
            <p>{contactInfo.introduction}</p>
            {[
              ["email", "fas fa-envelope"],
              ["mobile", "fas fa-phone"],
              ["location", "fas fa-map-marker-alt"],
            ].map(
              ([field, icon]) =>
                contactInfo[`${field}Visible`] &&
                contactInfo[field] && (
                  <div className="contact-item" key={field}>
                    <i className={icon} aria-hidden="true" />
                    {field === "location" ? (
                      <span>{contactInfo[field]}</span>
                    ) : (
                      <a
                        href={`${field === "email" ? "mailto:" : "tel:"}${contactInfo[field]}`}
                      >
                        {contactInfo[field]}
                      </a>
                    )}
                  </div>
                ),
            )}
            <div className="contact-socials">{socials}</div>
          </div>
          {settings.contactFormEnabled ? (
            <ContactForm
              inquiryEnabled={settings.inquiryEnabled}
              disabled={offline}
            />
          ) : (
            <p className="portfolio-empty">
              The contact form is currently closed.
            </p>
          )}
        </div>
      );
    return null;
  }
  return (
    <div className="premium-portfolio dark-portfolio">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header
        navigation={content.navigation}
        brand={settings.portfolioTitle}
        defaultTheme={settings.theme}
      />
      {(error || offline) && (
        <div className="content-error" role="status">
          {offline
            ? "You can browse my portfolio. Live updates and message submissions are temporarily unavailable."
            : "Some updates could not be loaded."}{" "}
          <button onClick={reload}>Try again</button>
        </div>
      )}
      <main id="main-content">
        {sections.map((section) => (
          <section
            id={section.key}
            data-background={
              section.key === "home" ? profile.backgroundVisual : undefined
            }
            className={
              section.key === "home" ? "hero premium-hero" : section.key
            }
            key={section.id}
          >
            {section.key === "home" ? (
              sectionContent(section.key)
            ) : (
              <div className="container">
                <div className="section-heading">
                  <span className="section-number">
                    {String(sections.indexOf(section)).padStart(2, "0")}
                  </span>
                  <h2 className="section-title">
                    {section.key === "about"
                      ? about.heading
                      : section.key === "contact"
                        ? contactInfo.heading
                        : section.heading}
                  </h2>
                  <span className="section-rule" aria-hidden="true" />
                </div>
                {sectionContent(section.key)}
              </div>
            )}
          </section>
        ))}
      </main>
      <footer>
        <div className="footer-content">
          {socials}
          <p>
            ©{" "}
            {settings.footerUrl ? (
              <a
                href={settings.footerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {settings.footerText}
              </a>
            ) : (
              settings.footerText
            )}
          </p>
        </div>
      </footer>
      <SectionAnimations
        key={sections.map((section) => section.id).join()}
        enabled={settings.animationsEnabled}
      />
      <VisitorAnalytics enabled={analyticsEnabled} />
    </div>
  );
}

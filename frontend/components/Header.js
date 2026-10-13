"use client";

import { useEffect, useRef, useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [active, setActive] = useState("home");
  const headerRef = useRef(null);
  const menuButton = useRef(null);

  useEffect(() => {
    let savedTheme = "light";
    try {
      savedTheme = localStorage.getItem("portfolio-theme") === "dark" ? "dark" : "light";
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  useEffect(() => {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -60% 0px", threshold: 0 });
    document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    const outside = (event) => { if (!headerRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [menuOpen]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {
      // Persistence is optional.
    }
  }

  return (
    <header ref={headerRef}>
      <nav aria-label="Main navigation">
        <a className="logo" href="#home" onClick={() => setMenuOpen(false)}>Soumitra Samanta</a>
        <ul id="nav-links" className={`nav-links${menuOpen ? " active" : ""}`}>
          {["home", "about", "experience", "projects", "contact"].map((section) => (
            <li key={section}>
              <a href={`#${section}`} aria-current={active === section ? "location" : undefined} onClick={() => { setMenuOpen(false); setActive(section); }}>
                {section[0].toUpperCase() + section.slice(1)}
              </a>
            </li>
          ))}
          <li>
            <button type="button" className="theme-toggle" onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              <i className={`fas fa-${theme === "dark" ? "sun" : "moon"}`} aria-hidden="true" />
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </li>
        </ul>
        <button ref={menuButton} type="button" className="mobile-menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen} aria-controls="nav-links"
          onClick={() => setMenuOpen(!menuOpen)}>
          <i className={`fas fa-${menuOpen ? "times" : "bars"}`} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

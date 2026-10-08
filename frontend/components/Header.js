"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");

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
    <header>
      <nav aria-label="Main navigation">
        <div className="logo">Soumitra Samanta</div>
        <ul id="nav-links" className={`nav-links${menuOpen ? " active" : ""}`}>
          {["home", "about", "experience", "projects", "contact"].map((section) => (
            <li key={section}>
              <a href={`#${section}`} onClick={() => setMenuOpen(false)}>
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
        <button type="button" className="mobile-menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen} aria-controls="nav-links"
          onClick={() => setMenuOpen(!menuOpen)}>
          <i className={`fas fa-${menuOpen ? "times" : "bars"}`} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

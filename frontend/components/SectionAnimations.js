"use client";

import { useEffect } from "react";

export default function SectionAnimations({ enabled = true }) {
  useEffect(() => {
    if (
      !enabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.IntersectionObserver
    )
      return;
    const sections = document.querySelectorAll("main section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-pending");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    sections.forEach((section) => {
      section.classList.add("reveal-section");
      if (section.getBoundingClientRect().top >= window.innerHeight) {
        section.classList.add("reveal-pending");
      }
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
      sections.forEach((section) => section.classList.remove("reveal-pending"));
    };
  }, [enabled]);

  return null;
}

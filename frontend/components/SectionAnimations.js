"use client";

import { useEffect } from "react";

export default function SectionAnimations() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.IntersectionObserver) return;
    const sections = document.querySelectorAll("main section");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

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
  }, []);

  return null;
}

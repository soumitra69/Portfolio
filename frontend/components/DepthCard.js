"use client";
import { useEffect, useRef } from "react";

export default function DepthCard({
  as: Element = "div",
  className = "",
  children,
  enabled = true,
}) {
  const ref = useRef(null);
  const frame = useRef(null);
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );
  function move(event) {
    if (
      !enabled ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 768px)")
        .matches
    )
      return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.setProperty("--tilt-x", `${-y * 6}deg`);
        ref.current.style.setProperty("--tilt-y", `${x * 6}deg`);
      }
    });
  }
  function reset() {
    if (frame.current) cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  }
  return (
    <Element
      ref={ref}
      className={`depth-card ${className}`}
      onPointerMove={move}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </Element>
  );
}

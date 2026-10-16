"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { imageProps } from "../shared/image-assets.mjs";

export default function Gallery({ items }) {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const categories = [
    "All",
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ];
  const filtered =
    category === "All"
      ? items
      : items.filter((item) => item.category === category);
  const index = filtered.findIndex((item) => item.id === selected);
  const current = filtered[index];
  function close() {
    dialog.current?.close();
    setSelected(null);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (current && !dialog.current?.open) dialog.current?.showModal();
    else if (!current) dialog.current?.close();
  }, [current]);
  useEffect(() => {
    if (category !== "All" && !items.some((item) => item.category === category))
      setCategory("All");
  }, [items, category]);
  function next(delta) {
    if (filtered.length)
      setSelected(
        filtered[(index + delta + filtered.length) % filtered.length].id,
      );
  }
  if (!items.length)
    return (
      <div className="portfolio-empty">
        <i className="far fa-images" aria-hidden="true" />
        <p>No gallery images have been added yet.</p>
      </div>
    );
  return (
    <>
      {categories.length > 2 && (
        <div className="gallery-filters" aria-label="Gallery categories">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => {
                setCategory(name);
                close();
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="gallery-grid">
        {filtered.map((item) => (
          <button
            className="gallery-card"
            key={item.id}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setSelected(item.id);
            }}
            aria-label={`Open ${item.title}`}
          >
            <Image
              alt={item.title}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 33vw"
              {...imageProps(item.image, 700, 700)}
            />
            {item.featured && <span className="featured-label">Featured</span>}
            <span>
              <strong>{item.title}</strong>
              <small>{item.category}</small>
              <i className="fas fa-expand" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="gallery-lightbox"
        aria-label={current?.title || "Image preview"}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            next(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            next(-1);
          }
        }}
      >
        {current && (
          <div className="lightbox-content">
            <button
              className="lightbox-close"
              aria-label="Close image"
              onClick={close}
            >
              ×
            </button>
            <Image
              src={current.image}
              width={1800}
              height={1200}
              alt={current.title}
              unoptimized
            />
            <div className="lightbox-caption">
              <h3>{current.title}</h3>
              <p>{current.description}</p>
              {current.date && <time dateTime={current.date}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(current.date))}</time>}
              {current.externalUrl && (
                <a
                  href={current.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View {current.title} related project
                </a>
              )}
            </div>
            <div className="lightbox-controls">
              <button onClick={() => next(-1)} aria-label="Previous image">
                ←
              </button>
              <span>
                {index + 1} / {filtered.length}
              </span>
              <button onClick={() => next(1)} aria-label="Next image">
                →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

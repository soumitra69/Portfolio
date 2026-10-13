"use client";

import { useEffect, useRef, useState } from "react";

export default function ContactForm({ inquiryEnabled = true }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [mode, setMode] = useState("contact");
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    if (!inquiryEnabled) setMode("contact");
    const chooseInquiry = (event) => {
      if (
        !inquiryEnabled ||
        !event.target.closest('[data-contact-mode="inquiry"]')
      )
        return;
      setMode("inquiry");
      setErrors({});
      setStatus({ state: "idle", message: "" });
      formRef.current
        ?.querySelector('[name="name"]')
        ?.focus({ preventScroll: true });
    };
    document.addEventListener("click", chooseInquiry);
    return () => document.removeEventListener("click", chooseInquiry);
  }, [inquiryEnabled]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (status.state === "sending") return;
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const invalid = {};
    for (const key of [
      "name",
      "email",
      "message",
      mode === "contact" ? "subject" : "projectType",
    ]) {
      if (!String(payload[key] || "").trim())
        invalid[key] = "Please complete this field.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email || ""))
      invalid.email = "Enter a valid email address.";
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      setStatus({
        state: "error",
        message: "Please check the highlighted fields.",
      });
      form.elements.namedItem(Object.keys(invalid)[0])?.focus();
      return;
    }
    setErrors({});
    setStatus({ state: "sending", message: "Sending your message…" });

    try {
      const response = await fetch(
        mode === "contact" ? "/api/messages" : "/api/inquiries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25000),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (result?.errors) {
          setErrors(result.errors);
          form.elements.namedItem(Object.keys(result.errors)[0])?.focus();
        }
        throw new Error(
          result?.message || "Unable to send your message. Please try again.",
        );
      }
      setStatus({ state: "success", message: result.message });
      form.reset();
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error.name === "TimeoutError" || error instanceof TypeError
            ? "Unable to reach the server. Please try again shortly."
            : error.message,
      });
    }
  }

  return (
    <form
      id="contact-form"
      ref={formRef}
      className="contact-form"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={status.state === "sending"}
    >
      <fieldset
        className="contact-purpose"
        disabled={status.state === "sending"}
      >
        <legend>What would you like to discuss?</legend>
        <div className="contact-mode-options">
          {[
            ["contact", "Send a message"],
            ...(inquiryEnabled ? [["inquiry", "Discuss a project"]] : []),
          ].map(([value, label]) => (
            <label key={value} className={mode === value ? "selected" : ""}>
              <input
                type="radio"
                name="purpose"
                value={value}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  setErrors({});
                  setStatus({ state: "idle", message: "" });
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-trap" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <fieldset
        className="contact-fields"
        disabled={status.state === "sending"}
      >
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            maxLength={100}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="field-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
        {mode === "contact" ? (
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              placeholder="What is your message about?"
              required
              maxLength={150}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "subject-error" : undefined}
            />
            {errors.subject && (
              <p id="subject-error" className="field-error">
                {errors.subject}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="company">
                Company <span className="optional-label">(optional)</span>
              </label>
              <input
                id="company"
                name="company"
                autoComplete="organization"
                maxLength={150}
                placeholder="Company or organization"
              />
            </div>
            <div className="form-group">
              <label htmlFor="projectType">Project type</label>
              <select
                id="projectType"
                name="projectType"
                required
                defaultValue=""
                aria-invalid={Boolean(errors.projectType)}
                aria-describedby={
                  errors.projectType ? "projectType-error" : undefined
                }
              >
                <option value="" disabled>
                  Select a project type
                </option>
                {[
                  "Website",
                  "Web application",
                  "Frontend development",
                  "Portfolio",
                  "Other",
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              {errors.projectType && (
                <p id="projectType-error" className="field-error">
                  {errors.projectType}
                </p>
              )}
            </div>
          </>
        )}
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            placeholder={
              mode === "contact"
                ? "Tell me what you have in mind..."
                : "Tell me about your project, goals, and timeline..."
            }
            maxLength={5000}
            required
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "message-error" : undefined}
          />
          {errors.message && (
            <p id="message-error" className="field-error">
              {errors.message}
            </p>
          )}
        </div>
      </fieldset>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status.state === "sending"}
      >
        <i
          aria-hidden="true"
          className={`fas ${status.state === "sending" ? "fa-circle-notch fa-spin" : "fa-paper-plane"}`}
        />
        {status.state === "sending"
          ? "Sending…"
          : mode === "contact"
            ? "Send Message"
            : "Send Project Inquiry"}
      </button>
      <p className="form-help">
        Your details are used only to respond to your{" "}
        {mode === "contact" ? "message" : "project inquiry"}.
      </p>
      <p
        className={`form-status ${status.state}`}
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  );
}

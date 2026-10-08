"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    if (status.state === "sending") return;
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    setStatus({ state: "sending", message: "Sending your message…" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || "Unable to send your message. Please try again.");
      }
      setStatus({ state: "success", message: result.message });
      form.reset();
    } catch (error) {
      setStatus({
        state: "error",
        message: error.name === "TimeoutError" || error instanceof TypeError
          ? "Unable to reach the server. Please try again shortly."
          : error.message,
      });
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} aria-busy={status.state === "sending"}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" autoComplete="name" maxLength={100} required />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" autoComplete="email" maxLength={254} required />
      </div>
      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={5} maxLength={5000} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={status.state === "sending"}>
        {status.state === "sending" ? "Sending…" : "Send Message"}
      </button>
      <p className={`form-status ${status.state}`} role="status" aria-live="polite">{status.message}</p>
    </form>
  );
}

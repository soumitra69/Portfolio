"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import defaultProfile from "../shared/profile.json";

export default function ProfileManager({ profile, busy, run, refresh, request }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const input = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(event) {
    const selected = event.target.files[0];
    setError("");
    setFile(null);
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, or WebP image no larger than 10 MB.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  function save(event) {
    event.preventDefault();
    if (!file) return;
    run(async () => {
      await request("/admin/profile-photo", { method: "POST", body: file, headers: { "Content-Type": file.type } });
      setFile(null);
      input.current.value = "";
      await refresh();
    }, "Profile photo updated.");
  }

  function restore() {
    if (!window.confirm("Restore the original portfolio photo?")) return;
    run(async () => {
      await request("/admin/profile-photo", { method: "DELETE" });
      setFile(null);
      setError("");
      input.current.value = "";
      await refresh();
    }, "Original profile photo restored.");
  }

  return (
    <form className="admin-project-form admin-profile-form" onSubmit={save}>
      <h3>Change profile photo</h3>
      <p className="admin-form-help">Update the photo shown at the top of your portfolio.</p>
      <Image className="admin-profile-preview" src={preview || profile.photoUrl} alt={preview ? "Selected profile photo preview" : "Current profile photo"} width={180} height={180} unoptimized />
      <label htmlFor="profile-photo">Choose a new photo</label>
      <input ref={input} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy} />
      <p className="admin-form-help">JPEG, PNG, or WebP, up to 10 MB. Your photo is cropped to a square for the circular profile image.</p>
      {error && <p className="admin-notice is-error" role="alert">{error}</p>}
      <div className="admin-actions"><button className="admin-primary" disabled={busy || !file}>{busy ? "Saving…" : "Save Photo"}</button>
        <button type="button" disabled={busy || profile.photoUrl === defaultProfile.photoUrl} onClick={restore}>Restore original photo</button></div>
    </form>
  );
}

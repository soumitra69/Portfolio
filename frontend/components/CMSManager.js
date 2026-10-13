"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import definitions from "../shared/cms-fields.json";

export async function uploadImage(file, request) {
  if (
    !file ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024 ||
    !/\.(jpe?g|png|webp)$/i.test(file.name)
  )
    throw Error("Choose a JPEG, PNG or WebP image under 10 MB.");
  return request("/admin/uploads", {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type,
      "X-File-Name": encodeURIComponent(file.name),
    },
  });
}

function startingForm(descriptor, record) {
  return Object.fromEntries(
    [
      ...descriptor.fields,
      ...(!descriptor.singleton
        ? [
            ["isVisible", "", "boolean"],
            ["isActive", "", "boolean"],
          ]
        : []),
    ].map(([name, , type, , , choices]) => [
      name,
      type === "list"
        ? (record?.[name] || []).join("\n")
        : (record?.[name] ??
          (type === "boolean"
            ? ["isVisible", "isActive"].includes(name)
            : choices?.[0] || "")),
    ]),
  );
}
export default function CMSManager({
  kind,
  content,
  request,
  refresh,
  busy,
  run,
}) {
  const descriptor = definitions[kind];
  const records = descriptor.singleton ? [] : content || [];
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() =>
    startingForm(descriptor, descriptor.singleton ? content : null),
  );
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const dialog = useRef(null);
  const dragged = useRef(null);
  const editor = useRef(null);
  useEffect(() => {
    if (descriptor.singleton) setForm(startingForm(descriptor, content));
  }, [content, descriptor]);
  function edit(record) {
    setEditing(record?.id || null);
    setForm(startingForm(descriptor, record));
    setErrors({});
    editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function save(event) {
    event.preventDefault();
    setErrors({});
    const payload = {};
    for (const [name, , type] of descriptor.fields) {
      if (type === "list")
        payload[name] = (form[name] || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
      else if (["number", "year"].includes(type))
        payload[name] = form[name] === "" ? null : Number(form[name]);
      else payload[name] = form[name];
    }
    if (!descriptor.singleton) {
      payload.isVisible = form.isVisible;
      payload.isActive = form.isActive;
    }
    await run(async () => {
      try {
        await request(`/admin/cms/${kind}${editing ? `/${editing}` : ""}`, {
          method: descriptor.singleton || editing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
      } catch (error) {
        setErrors(error.fields || {});
        throw error;
      }
      if (!descriptor.singleton) edit(null);
      await refresh();
    }, `${descriptor.label} saved.`);
  }
  function move(id, targetId) {
    if (busy || query || id === targetId) return;
    const ids = records.map((item) => item.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    run(async () => {
      await request(`/admin/cms/${kind}/order`, {
        method: "PUT",
        body: JSON.stringify({ ids }),
      });
      await refresh();
    }, "Display order saved.");
  }
  function toggle(record, field) {
    run(async () => {
      await request(`/admin/cms/${kind}/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: record[field] === false }),
      });
      await refresh();
    }, "Visibility and active state saved.");
  }
  function confirmDelete(record) {
    setPendingDelete(record);
    dialog.current?.showModal();
  }
  async function remove() {
    const record = pendingDelete;
    dialog.current?.close();
    setPendingDelete(null);
    await run(async () => {
      await request(`/admin/cms/${kind}/${record.id}`, { method: "DELETE" });
      if (editing === record.id) edit(null);
      await refresh();
    }, "Item permanently deleted.");
  }
  const update = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const fields = [
    ...descriptor.fields,
    ...(!descriptor.singleton
      ? [
          ["isVisible", "Visible publicly", "boolean"],
          ["isActive", "Active", "boolean"],
        ]
      : []),
  ];
  return (
    <div className={descriptor.singleton ? "cms-singleton" : "cms-layout"}>
      {!descriptor.singleton && (
        <div className="cms-items">
          <div className="cms-toolbar">
            <label htmlFor={`search-${kind}`} className="sr-only">
              Search {descriptor.label}
            </label>
            <input
              id={`search-${kind}`}
              type="search"
              placeholder={`Search ${descriptor.label.toLowerCase()}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button onClick={() => edit(null)} disabled={busy}>
              Add new
            </button>
          </div>
          <p className="admin-form-help">
            Drag cards to reorder, or use Move up / Move down. Hidden and
            inactive items stay saved.
          </p>
          {records
            .filter((record) =>
              JSON.stringify(record)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((record, index) => (
              <article
                className="admin-project cms-item"
                key={record.id}
                draggable={!busy && !query}
                onDragStart={() => {
                  dragged.current = record.id;
                }}
                onDragEnd={() => {
                  dragged.current = null;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  move(dragged.current, record.id);
                }}
              >
                <div className="cms-item-heading">
                  <span className="cms-grip" aria-hidden="true">
                    ⠿
                  </span>
                  {record.image && (
                    <Image
                      src={record.image}
                      alt=""
                      width={70}
                      height={55}
                      unoptimized
                      className="cms-thumb"
                    />
                  )}
                  <div>
                    <h3>
                      {record.title ||
                        record.name ||
                        record.role ||
                        record.degree ||
                        record.heading}
                    </h3>
                    <span
                      className={`cms-state ${record.isVisible === false || record.isActive === false ? "is-hidden" : ""}`}
                    >
                      {record.isVisible === false ? "Hidden" : "Visible"} ·{" "}
                      {record.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </div>
                </div>
                <p className="cms-summary">
                  {record.shortDescription ||
                    record.company ||
                    record.institution ||
                    record.link ||
                    record.url ||
                    record.category ||
                    record.description}
                </p>
                <div className="admin-actions">
                  <button disabled={busy} onClick={() => edit(record)}>
                    Edit
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => toggle(record, "isVisible")}
                  >
                    {record.isVisible === false ? "Show" : "Hide"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => toggle(record, "isActive")}
                  >
                    {record.isActive === false ? "Activate" : "Deactivate"}
                  </button>
                  <button
                    aria-label={`Move ${record.title || record.name || record.role || record.degree || record.heading} up`}
                    disabled={busy || !!query || index === 0}
                    onClick={() => move(record.id, records[index - 1].id)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${record.title || record.name || record.role || record.degree || record.heading} down`}
                    disabled={busy || !!query || index === records.length - 1}
                    onClick={() => move(record.id, records[index + 1].id)}
                  >
                    ↓
                  </button>
                  <button
                    className="admin-danger"
                    disabled={busy}
                    onClick={() => confirmDelete(record)}
                  >
                    Delete
                  </button>
                </div>
                {record.updatedAt && (
                  <time className="cms-timestamp" dateTime={record.updatedAt}>
                    Updated {new Date(record.updatedAt).toLocaleString()}
                  </time>
                )}
              </article>
            ))}
          {!records.length && (
            <div className="admin-empty">
              <i className="fas fa-folder-open" aria-hidden="true" />
              <h3>No {descriptor.label.toLowerCase()} yet</h3>
              <p>Add your own content using the editor.</p>
            </div>
          )}
          {records.length > 0 &&
            !records.some((record) =>
              JSON.stringify(record)
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && <p className="admin-empty">No matching items.</p>}
        </div>
      )}
      <form
        className="admin-project-form cms-editor"
        ref={editor}
        onSubmit={save}
      >
        <h3>
          {descriptor.singleton
            ? `Edit ${descriptor.label.toLowerCase()}`
            : `${editing ? "Edit" : "Add"} ${descriptor.label.toLowerCase()}`}
        </h3>
        <p className="admin-form-help">
          Saved changes appear in the public portfolio automatically. Required
          fields are marked *.
        </p>
        <fieldset disabled={busy || uploading} className="cms-fieldset">
          {fields.map(([name, label, type, required, maximum, choices]) => {
            const id = `${kind}-${name}`;
            const invalid = !!errors[name];
            if (type === "boolean")
              return (
                <label className="admin-checkbox" key={name} htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={!!form[name]}
                    onChange={(event) => update(name, event.target.checked)}
                  />
                  {label}
                </label>
              );
            const props = {
              id,
              required: !!required,
              value: form[name] ?? "",
              "aria-invalid": invalid,
              "aria-describedby": invalid ? `${id}-error` : undefined,
              onChange: (event) => update(name, event.target.value),
            };
            return (
              <div className="cms-field" key={name}>
                <label htmlFor={id}>
                  {label}
                  {required ? " *" : ""}
                </label>
                {["textarea", "list"].includes(type) ? (
                  <textarea
                    {...props}
                    rows={type === "textarea" ? 4 : 3}
                    maxLength={maximum}
                  />
                ) : type === "select" ? (
                  <select {...props}>
                    {choices.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...props}
                    readOnly={type === "image"}
                    type={
                      type === "year" || type === "number"
                        ? "number"
                        : ["email", "url", "date", "month", "color"].includes(
                              type,
                            )
                          ? type
                          : "text"
                    }
                    min={
                      type === "year" ? 1900 : type === "number" ? 0 : undefined
                    }
                    max={
                      ["year", "number"].includes(type) ? maximum : undefined
                    }
                    maxLength={maximum}
                  />
                )}
                {type === "list" && (
                  <p className="admin-form-help">One item per line.</p>
                )}
                {type === "icon" && (
                  <p className="admin-form-help">
                    Font Awesome classes, e.g. fas fa-code or fab fa-react.
                  </p>
                )}
                {type === "image" && (
                  <>
                    <label
                      htmlFor={`${id}-upload`}
                      className="cms-upload-label"
                    >
                      Upload image
                    </label>
                    <input
                      id={`${id}-upload`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        await run(async () => {
                          const result = await uploadImage(file, request);
                          update(name, result.url);
                        }, "Image uploaded. Save the content to publish it.");
                        setUploading(false);
                        event.target.value = "";
                      }}
                    />
                    {form[name] && (
                      <button type="button" onClick={() => update(name, "")}>
                        Remove image
                      </button>
                    )}
                    {form[name] && (
                      <Image
                        className="cms-image-preview"
                        src={form[name]}
                        alt="Selected image preview"
                        width={360}
                        height={220}
                        unoptimized
                      />
                    )}
                  </>
                )}
                {invalid && (
                  <p id={`${id}-error`} className="cms-error">
                    {errors[name]}
                  </p>
                )}
              </div>
            );
          })}
          <div className="admin-actions">
            <button className="admin-primary" type="submit">
              {busy ? "Saving…" : uploading ? "Uploading…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() =>
                descriptor.singleton
                  ? setForm(startingForm(descriptor, content))
                  : edit(null)
              }
            >
              Cancel edits
            </button>
            {descriptor.singleton && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Reset ${descriptor.label.toLowerCase()} to the original portfolio content?`,
                    )
                  )
                    run(async () => {
                      await request(`/admin/cms/${kind}/reset`, {
                        method: "POST",
                      });
                      await refresh();
                    }, "Original content restored.");
                }}
              >
                Reset to original
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <dialog
        ref={dialog}
        className="cms-dialog"
        onCancel={() => setPendingDelete(null)}
      >
        <h3>Permanently delete this item?</h3>
        <p>
          {pendingDelete?.title ||
            pendingDelete?.name ||
            pendingDelete?.role ||
            pendingDelete?.degree ||
            pendingDelete?.heading}
        </p>
        <p>This cannot be undone. Choose Hide to keep the item for later.</p>
        <div className="admin-actions">
          <button
            autoFocus
            onClick={() => {
              dialog.current?.close();
              setPendingDelete(null);
            }}
          >
            Cancel
          </button>
          <button className="admin-danger" onClick={remove}>
            Permanently delete
          </button>
        </div>
      </dialog>
    </div>
  );
}

export function ProfilePhotoManager({ profile, request, run, refresh, busy }) {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="admin-project-form admin-profile-form">
      <h3>Profile display picture</h3>
      <p className="admin-form-help">
        JPEG, PNG or WebP, up to 10 MB. Images are resized and optimized before
        storage.
      </p>
      {preview || profile.photoUrl ? (
        <Image
          src={preview || profile.photoUrl}
          width={220}
          height={220}
          className="admin-profile-preview"
          alt="Profile image preview"
          unoptimized
        />
      ) : (
        <p className="admin-empty">No profile image selected.</p>
      )}
      <p className="cms-state">
        {profile.photoVisible ? "Visible publicly" : "Hidden publicly"}
      </p>
      <label htmlFor="profile-photo-file">Choose or replace image</label>
      <input
        id="profile-photo-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      <div className="admin-actions">
        <button
          className="admin-primary"
          disabled={busy || !file}
          onClick={() =>
            run(async () => {
              const upload = await uploadImage(file, request);
              await request("/admin/cms/profile-photo", {
                method: "PATCH",
                body: JSON.stringify({
                  photoUrl: upload.url,
                  photoVisible: true,
                }),
              });
              setFile(null);
              await refresh();
            }, "Profile image updated everywhere.")
          }
        >
          Upload and save
        </button>
        <button
          disabled={busy || !profile.photoUrl}
          onClick={() =>
            run(async () => {
              await request("/admin/cms/profile-photo", {
                method: "PATCH",
                body: JSON.stringify({ photoVisible: !profile.photoVisible }),
              });
              await refresh();
            }, "Photo visibility updated.")
          }
        >
          {profile.photoVisible ? "Hide" : "Show"}
        </button>
        <button
          className="admin-danger"
          disabled={busy || !profile.photoUrl}
          onClick={() => {
            if (
              window.confirm("Remove the profile picture from the portfolio?")
            )
              run(async () => {
                await request("/admin/cms/profile-photo", {
                  method: "PATCH",
                  body: JSON.stringify({ photoUrl: "", photoVisible: false }),
                });
                setFile(null);
                await refresh();
              }, "Profile picture removed.");
          }}
        >
          Delete photo
        </button>
      </div>
    </div>
  );
}

export function MediaLibrary({ request, run, busy, revision }) {
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request("/admin/uploads")
      .then((data) => {
        if (active) {
          setUploads(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Unable to load image library.");
      });
    return () => {
      active = false;
    };
  }, [request, revision]);
  return (
    <div className="admin-project">
      <h3>Uploaded image library</h3>
      <p className="admin-form-help">
        Content deletion keeps uploaded files available for reuse. Delete unused
        files here to remove them permanently from storage.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="cms-media-grid">
        {uploads.map((upload) => (
          <article key={upload.id}>
            <Image
              src={upload.url}
              width={200}
              height={130}
              alt="Uploaded image"
              unoptimized
            />
            <input aria-label="Image URL" readOnly value={upload.url} />
            <button
              className="admin-danger"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Permanently delete this uploaded file? Images still used by portfolio content are protected.",
                  )
                )
                  run(async () => {
                    await request(`/admin/uploads/${upload.id}`, {
                      method: "DELETE",
                    });
                    setUploads((current) =>
                      current.filter((item) => item.id !== upload.id),
                    );
                  }, "Unused image deleted from storage.");
              }}
            >
              Delete file
            </button>
          </article>
        ))}
      </div>
      {!uploads.length && !error && <p>No uploaded images yet.</p>}
    </div>
  );
}

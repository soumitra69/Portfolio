const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateSubmission(input, kind) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { errors: { form: "Enter your contact details." } };
  const errors = {};
  const data = {};
  const field = (key, max, required = false) => {
    const raw = input[key] ?? "";
    if (typeof raw !== "string" || raw.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw)) { errors[key] = `Enter a valid ${key} (up to ${max} characters).`; return; }
    const value = raw.trim();
    if (required && !value) errors[key] = `Please enter your ${key}.`;
    data[key] = value;
  };
  field("name", 100, true); field("email", 254, true); field("message", 5000, true);
  if (!emailPattern.test(data.email || "")) errors.email = "Enter a valid email address.";
  // Existing deployed contact clients did not send a subject. Preserve them
  // during rollout while validating subjects provided by the improved form.
  if (kind === "contact") { if (input.subject === undefined) data.subject = "General message"; else field("subject", 150, true); }
  else { field("company", 150); field("projectType", 100, true); }
  for (const key of ["name", "email", "subject", "company", "projectType"]) if (data[key] && /[\r\n]/.test(data[key])) errors[key] = "Use a single line for this field.";
  return { data, errors: Object.keys(errors).length ? errors : null };
}

export function pagination(query) {
  const page = Number(query.page || 1); const limit = Number(query.limit || 50);
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  return { page, limit };
}

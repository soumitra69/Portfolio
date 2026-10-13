import { validateSubmission, pagination } from "../utils/validation.js";
import { INQUIRY_STATUSES } from "../models/index.js";

export function createSubmissionControllers({ repository, notifier }) {
  return {
    submit: (kind) => async (request, response) => {
      if (request.body?.website) return response.status(201).json({ message: "Thank you! Your message has been received." });
      const { data, errors } = validateSubmission(request.body, kind);
      if (errors) return response.status(400).json({ message: "Please check the highlighted fields.", errors });
      const record = await repository.create(kind, data);
      let notification;
      try { notification = await notifier.send(kind, record); }
      catch (error) { notification = "failed"; console.error(`Owner notification failed (${error.name}).`); }
      // A saved submission remains successful even when the mail provider fails.
      await repository.update(kind, record.id, { notification }).catch((error) => console.error(`Notification status update failed (${error.name}).`));
      response.status(201).json({ message: kind === "contact" ? "Thank you! Your message has been received." : "Thank you! Your project inquiry has been received." });
    },
    list: (kind) => async (request, response) => {
      const options = pagination(request.query);
      if (!options) return response.status(400).json({ message: "Use a valid page and a limit between 1 and 100." });
      response.json(await repository.list(kind, options));
    },
    detail: (kind) => async (request, response) => {
      const record = await repository.get(kind, request.params.id);
      response.status(record ? 200 : 404).json(record || { message: "Submission not found." });
    },
    update: (kind) => async (request, response) => {
      const patch = kind === "contact" ? { read: request.body?.read } : { status: request.body?.status, updatedAt: new Date().toISOString() };
      if ((kind === "contact" && typeof patch.read !== "boolean") || (kind === "inquiry" && !INQUIRY_STATUSES.includes(patch.status))) return response.status(400).json({ message: kind === "contact" ? "Read must be a boolean." : "Choose a valid inquiry status." });
      const record = await repository.update(kind, request.params.id, patch);
      response.status(record ? 200 : 404).json(record || { message: "Submission not found." });
    },
    remove: (kind) => async (request, response) => {
      const deleted = await repository.remove(kind, request.params.id);
      response.status(deleted ? 200 : 404).json({ message: deleted ? "Submission deleted." : "Submission not found." });
    },
    retryNotification: (kind) => async (request, response) => {
      const record = await repository.get(kind, request.params.id);
      if (!record) return response.status(404).json({ message: "Submission not found." });
      if (!notifier.enabled) return response.status(503).json({ message: "Email notifications are not configured yet." });
      if (record.notification === "sent") return response.status(409).json({ message: "This notification was already sent." });
      try { const notification = await notifier.send(kind, record); await repository.update(kind, record.id, { notification }); response.json({ message: "Notification sent." }); }
      catch { await repository.update(kind, record.id, { notification: "failed" }); response.status(502).json({ message: "The email provider is unavailable. The submission is still saved." }); }
    },
  };
}

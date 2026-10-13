import nodemailer from "nodemailer";

export function createNotifier({ env = process.env, transport } = {}) {
  const enabled = Boolean(transport || (env.SMTP_HOST && env.SMTP_FROM && env.NOTIFICATION_EMAIL));
  if (enabled && !transport) transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === "true",
    requireTLS: env.SMTP_SECURE !== "true", connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
  });
  return {
    enabled,
    async verify() { if (!enabled) throw new Error("Set SMTP_HOST, SMTP_FROM and NOTIFICATION_EMAIL in backend/.env."); await transport.verify(); },
    async send(kind, record) {
      if (!enabled) return "disabled";
      const title = kind === "contact" ? `Portfolio message: ${record.subject}` : `Portfolio inquiry: ${record.projectType}`;
      const fields = [title, `Name: ${record.name}`, `Email: ${record.email}`,
        ...(kind === "inquiry" ? [`Company: ${record.company || "Not provided"}`, `Status: ${record.status}`] : []),
        `Submitted: ${record.createdAt}`, "", record.message];
      // A verified owner address sends the notification; the visitor is Reply-To.
      await transport.sendMail({ from: env.SMTP_FROM, to: env.NOTIFICATION_EMAIL, replyTo: record.email, subject: title, text: fields.join("\n") });
      return "sent";
    },
  };
}

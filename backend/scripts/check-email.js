import { createNotifier } from "../utils/email.js";
try { await createNotifier().verify(); console.log("SMTP connection and authentication verified. No email was sent."); }
catch (error) { console.error(`SMTP verification failed (${error.name}). Check SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, SMTP_PASSWORD and NOTIFICATION_EMAIL.`); process.exitCode = 1; }

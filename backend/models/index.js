import { Schema } from "mongoose";

export const INQUIRY_STATUSES = ["New", "Contacted", "In Progress", "Completed", "Rejected"];
const options = { versionKey: false, bufferCommands: false, autoCreate: false };
const text = (maxlength, required = false) => ({ type: String, trim: true, maxlength, required });
const submissionFields = {
  _id: String, name: text(100, true), email: { ...text(254, true), match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, message: text(5000, true),
  createdAt: { type: Date, default: Date.now, index: true },
  notification: { type: String, enum: ["pending", "sent", "failed", "disabled"], default: "pending" },
};

export function createModels(connection) {
  const model = (name, schema, collection) => connection.models[name] || connection.model(name, schema, collection);
  const admin = new Schema({
    _id: { type: String, default: "owner" }, name: { ...text(100), default: "Portfolio owner" },
    email: text(254), username: text(254, true),
    passwordHash: { type: String, required: true, select: false, match: /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/ },
    role: { type: String, enum: ["admin"], default: "admin" },
    tokenVersion: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now }, updatedAt: Date,
  }, options);
  const contact = new Schema({ ...submissionFields, subject: text(150, true), read: { type: Boolean, default: false } }, options);
  const inquiry = new Schema({
    ...submissionFields, company: text(150), projectType: text(100, true),
    status: { type: String, enum: INQUIRY_STATUSES, default: "New", index: true }, updatedAt: Date,
  }, options);
  const stats = new Schema({
    _id: String, date: { type: String, index: true }, visits: { type: Number, default: 0 },
    visitors: [String], pages: { type: Map, of: Number }, devices: { type: Map, of: Number },
    browsers: { type: Map, of: Number }, referrers: { type: Map, of: Number },
    lastVisitAt: Date, expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  }, options);
  const content = new Schema({ _id: String, revision: Number, data: Schema.Types.Mixed, migrations: Schema.Types.Mixed }, options);
  return {
    Admin: model("Admin", admin, "admins"),
    ContactMessage: model("ContactMessage", contact, "contactmessages"),
    ProjectInquiry: model("ProjectInquiry", inquiry, "projectinquiries"),
    VisitorStats: model("VisitorStats", stats, "visitorstats"),
    Portfolio: model("Portfolio", content, "portfolio"),
  };
}

import { randomUUID } from "node:crypto";
import { connectDatabase } from "./database.js";
import { createModels } from "../models/index.js";
import { createAdminAccounts } from "../src/admin-accounts.js";
import { encodeDimension, summarizeVisits } from "../utils/analytics.js";

const serialize = (record) => {
  if (!record) return null;
  const { _id, ...data } = record;
  return JSON.parse(JSON.stringify({ id: _id, ...data }));
};

export function createMongooseStore(uri, { database, loadInitialData } = {}) {
  let connection; let ready; let models; let queue = Promise.resolve();
  async function connect() {
    if (!ready) ready = (async () => {
      connection = await connectDatabase(uri, database);
      models = createModels(connection);
      await Promise.all(Object.values(models).map((model) => model.createIndexes()));
      let original = await models.Portfolio.findById("main").lean();
      if (!original) {
        const data = await loadInitialData();
        try { await models.Portfolio.updateOne({ _id: "main" }, { $setOnInsert: { revision: 0, data } }, { upsert: true }); }
        catch (error) { if (error.code !== 11000) throw error; }
        original = await models.Portfolio.findById("main").lean();
      }
      // Import once, preserving identifiers and existing records. Keep the original
      // content document intact so old projects, skills and profile edits survive.
      if (!original.migrations?.contacts) {
        const messages = original.data.messages || [];
        if (messages.length) await models.ContactMessage.bulkWrite(messages.map(({ id, ...message }) => ({ updateOne: {
          filter: { _id: id }, update: { $setOnInsert: { ...message, subject: message.subject || "General message", notification: message.notification || "disabled" } }, upsert: true,
        } })));
        await models.Portfolio.updateOne({ _id: "main" }, { $set: { "migrations.contacts": true } });
      }
      const owner = await models.Admin.findById("owner").lean();
      if (owner && !owner.email) await models.Admin.updateOne({ _id: "owner", email: { $exists: false } }, {
        $set: { email: owner.username, name: "Portfolio owner", role: owner.role || "admin", tokenVersion: owner.tokenVersion || 0 },
      });
      return models;
    })().catch(async (error) => { ready = undefined; await connection?.close().catch(() => {}); throw error; });
    return ready;
  }
  const submissionModel = (kind) => kind === "contact" ? models.ContactMessage : models.ProjectInquiry;
  return {
    async read() { await queue; await connect(); const record = await models.Portfolio.findById("main").lean(); return structuredClone(record.data); },
    update(action) {
      const task = queue.then(async () => {
        await connect();
        for (let attempt = 0; attempt < 20; attempt++) {
          const record = await models.Portfolio.findById("main").lean();
          const data = structuredClone(record.data); const result = action(data);
          const saved = await models.Portfolio.updateOne({ _id: "main", revision: record.revision }, { $set: { data }, $inc: { revision: 1 } });
          if (saved.matchedCount === 1) return result;
        }
        throw new Error("Portfolio changed repeatedly. Please try again.");
      });
      queue = task.catch(() => {}); return task;
    },
    async authenticateAdmin(username, password) { await connect(); return createAdminAccounts(connection.db.collection("admins")).authenticate(username, password); },
    async getAdminAuthVersion() { await connect(); const owner = await models.Admin.findById("owner").lean(); if (!owner || (owner.role && owner.role !== "admin")) throw new Error("Admin unavailable"); return owner.tokenVersion || 0; },
    async revokeAdminSessions() { await connect(); await models.Admin.updateOne({ _id: "owner" }, { $inc: { tokenVersion: 1 } }); },
    submissions: {
      async create(kind, data) { await connect(); return serialize((await submissionModel(kind).create({ _id: randomUUID(), ...data })).toObject()); },
      async list(kind, { page = 1, limit = 50 } = {}) { await connect(); return (await submissionModel(kind).find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean()).map(serialize); },
      async get(kind, id) { await connect(); return serialize(await submissionModel(kind).findById(id).lean()); },
      async update(kind, id, patch) { await connect(); return serialize(await submissionModel(kind).findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after", runValidators: true }).lean()); },
      async remove(kind, id) { await connect(); return (await submissionModel(kind).deleteOne({ _id: id })).deletedCount === 1; },
      async recordVisit(visit) {
        await connect();
        const increments = { visits: 1 };
        for (const [key, value] of Object.entries({ pages: visit.path, devices: visit.device, browsers: visit.browser, referrers: visit.referrer })) increments[`${key}.${encodeDimension(value)}`] = 1;
        const update = {
          $inc: increments, $addToSet: { visitors: visit.visitor }, $set: { lastVisitAt: visit.lastVisitAt },
          $setOnInsert: { date: visit.date, expiresAt: new Date(new Date(visit.date).getTime() + 90 * 86400000) },
        };
        try { await models.VisitorStats.updateOne({ _id: visit.date }, update, { upsert: true, setDefaultsOnInsert: false }); }
        catch (error) {
          if (error.code !== 11000) throw error;
          // Another request created the day's aggregate; count this visit once.
          await models.VisitorStats.updateOne({ _id: visit.date }, update, { setDefaultsOnInsert: false });
        }
      },
      async analytics() { await connect(); const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10); return summarizeVisits(await models.VisitorStats.find({ date: { $gte: since } }).lean()); },
      async overview() { await connect(); const [messages, unread, inquiries, newInquiries] = await Promise.all([
        models.ContactMessage.countDocuments(), models.ContactMessage.countDocuments({ read: false }), models.ProjectInquiry.countDocuments(), models.ProjectInquiry.countDocuments({ status: "New" }),
      ]); return { messages, unread, inquiries, newInquiries }; },
    },
    async close() { await queue; await connection?.close(); },
  };
}

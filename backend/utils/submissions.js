import { randomUUID } from "node:crypto";
import { encodeDimension, summarizeVisits } from "./analytics.js";

// The local JSON adapter remains useful for isolated development and tests.
// Production uses the dedicated Mongoose collections through matching methods.
export function submissionRepository(store) {
  if (store.submissions) return store.submissions;
  const listKey = (kind) => kind === "contact" ? "messages" : "inquiries";
  return {
    async create(kind, data) {
      const record = { id: randomUUID(), ...data, createdAt: new Date().toISOString(), notification: "pending", ...(kind === "contact" ? { read: false } : { status: "New" }) };
      await store.update((state) => { (state[listKey(kind)] ||= []).push(record); });
      return record;
    },
    async list(kind, { page = 1, limit = 50 } = {}) { return (await store.read())[listKey(kind)]?.toReversed().slice((page - 1) * limit, page * limit) || []; },
    async get(kind, id) { return (await store.read())[listKey(kind)]?.find((record) => record.id === id) || null; },
    async update(kind, id, patch) {
      return store.update((state) => { const item = (state[listKey(kind)] || []).find((record) => record.id === id); if (item) Object.assign(item, patch); return item || null; });
    },
    async remove(kind, id) {
      return store.update((state) => { const items = state[listKey(kind)] || []; const index = items.findIndex((item) => item.id === id); if (index < 0) return false; items.splice(index, 1); return true; });
    },
    async recordVisit(visit) {
      await store.update((state) => {
        const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
        state.analytics = (state.analytics || []).filter((day) => day.date >= earliest);
        let day = state.analytics.find((item) => item.date === visit.date);
        if (!day) { day = { date: visit.date, visits: 0, visitors: [], pages: {}, devices: {}, browsers: {}, referrers: {} }; state.analytics.push(day); }
        day.visits++; day.lastVisitAt = visit.lastVisitAt;
        if (!day.visitors.includes(visit.visitor)) day.visitors.push(visit.visitor);
        for (const [key, label] of Object.entries({ pages: visit.path, devices: visit.device, browsers: visit.browser, referrers: visit.referrer })) {
          const encoded = encodeDimension(label); day[key][encoded] = (day[key][encoded] || 0) + 1;
        }
      });
    },
    async analytics() { return summarizeVisits((await store.read()).analytics || []); },
    async overview() { const data = await store.read(); return { messages: data.messages?.length || 0, unread: data.messages?.filter((item) => !item.read).length || 0, inquiries: data.inquiries?.length || 0, newInquiries: data.inquiries?.filter((item) => item.status === "New").length || 0 }; },
  };
}

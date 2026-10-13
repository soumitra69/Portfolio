import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { connectDatabase } from "../config/database.js";
import { createMongooseStore } from "../config/mongoose-store.js";
import { createAdminAccounts } from "../src/admin-accounts.js";
import { createApp } from "../src/app.js";

test("Atlas/Mongoose preserves migrated data and supports JWT, submissions, analytics and restart", {
  skip: process.env.RUN_MONGO_INTEGRATION !== "1" || !process.env.MONGODB_URI,
  timeout: 90000,
}, async (t) => {
  const database = `portfolio_validation_${randomBytes(8).toString("hex")}`;
  const seed = { projects: [{ id: "kept-project" }], skills: [], experience: [], profile: { photoUrl: "/assets/original.jpg" },
    messages: [{ id: "old-message", name: "Previous visitor", email: "old@example.test", message: "Keep my message", createdAt: "2026-01-01T00:00:00Z", read: false }] };
  let store = createMongooseStore(process.env.MONGODB_URI, { database, loadInitialData: async () => structuredClone(seed) });
  const connection = await connectDatabase(process.env.MONGODB_URI, database);
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await store.close();
    assert.equal(connection.name, database);
    assert.match(database, /^portfolio_validation_[a-f0-9]{16}$/);
    // Only the newly generated isolated validation database may be removed.
    try { await connection.dropDatabase(); } finally { await connection.close(); }
  });
  assert.equal((await store.read()).projects[0].id, "kept-project");
  const username = "integration@example.test"; const password = randomBytes(24).toString("hex");
  await createAdminAccounts(connection.db.collection("admins")).provision(username, password);
  const secret = randomBytes(48).toString("hex");
  server = createApp({ store, jwtSecret: secret, analyticsEnabled: true, notifier: { enabled: false, send: async () => "disabled" } }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body, cookie) => fetch(base + path, { method, headers: { "Content-Type": "application/json", "X-Admin-Request": "1", ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const response = await request("/api/admin/login", "POST", { username, password }); assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/contact", "POST", { name: "Visitor", email: "visitor@example.test", subject: "Atlas test", message: "Verify persistent messages" })).status, 201);
  assert.equal((await request("/api/inquiries", "POST", { name: "Client", email: "client@example.test", company: "Test", projectType: "Website", message: "Verify persistent inquiry" })).status, 201);
  const inquiries = await (await request("/api/admin/inquiries", "GET", undefined, cookie)).json();
  assert.equal(inquiries.length, 1);
  assert.equal((await request(`/api/admin/inquiries/${inquiries[0].id}`, "PATCH", { status: "Contacted" }, cookie)).status, 200);
  assert.equal((await request("/api/admin/messages/old-message", "DELETE", undefined, cookie)).status, 200);
  const visits = await Promise.all(Array.from({ length: 5 }, () => request("/api/analytics/visit", "POST", { path: "/", visitorId: "integration-visitor-123456" })));
  assert.ok(visits.every((visit) => visit.status === 204));
  const analytics = await (await request("/api/admin/analytics", "GET", undefined, cookie)).json();
  assert.equal(analytics.totalVisits, 5); assert.equal(analytics.dailyUniqueVisitors, 1);
  assert.equal((await request("/api/admin/logout", "POST", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/session", "GET", undefined, cookie)).status, 401);
  await new Promise((resolve) => server.close(resolve)); server = undefined;
  await store.close();
  store = createMongooseStore(process.env.MONGODB_URI, { database, loadInitialData: () => assert.fail("Existing content must not be replaced") });
  assert.equal((await store.read()).projects[0].id, "kept-project");
  assert.equal((await store.submissions.list("contact")).length, 1, "Deleted legacy messages must not return after restart");
  assert.equal((await store.submissions.list("inquiry"))[0].status, "Contacted");
  assert.equal(await store.getAdminAuthVersion(), 1, "Logout revocation survives restart");
  assert.equal((await connection.db.collection("admins").findOne({ _id: "owner" })).password, undefined);
});

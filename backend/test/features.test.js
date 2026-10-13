import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { createFileStore } from "../src/store.js";
import { createNotifier } from "../utils/email.js";
import { createModels } from "../models/index.js";
import { validateEnvironment } from "../config/environment.js";

const secret = randomBytes(48).toString("hex");
const contact = { name: "Visitor", email: "visitor@example.test", subject: "Website question", message: "Hello, I have a question." };
const inquiry = { name: "Client", email: "client@example.test", company: "Acme", projectType: "Website", message: "I would like to discuss a new website." };
async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-features-"));
  const store = createFileStore(join(directory, "data.json"));
  const app = createApp({ store, username: "owner@example.test", password: "Test-only-password", jwtSecret: secret, analyticsEnabled: true, ...options });
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await store.close(); assert.equal(dirname(directory), tmpdir()); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body, cookie, headers = {}) => fetch(base + path, { method,
    headers: { "Content-Type": "application/json", "X-Admin-Request": "1", ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const login = async () => { const response = await request("/api/admin/login", "POST", { username: "owner@example.test", password: "Test-only-password" }); assert.equal(response.status, 200); return response.headers.get("set-cookie").split(";")[0]; };
  return { store, request, login, base };
}

test("contact subject validates and stored records whitelist fields; owner receives SMTP notification", async (t) => {
  const sent = [];
  const notifier = createNotifier({ env: { SMTP_FROM: "portfolio@example.test", NOTIFICATION_EMAIL: "owner@example.test" }, transport: { async sendMail(message) { sent.push(message); } } });
  const { request, login } = await fixture(t, { notifier });
  for (const invalid of [{ ...contact, subject: "" }, { ...contact, email: { $ne: null } }, { ...contact, subject: "Hello\nBcc: attacker@example.test" }, { ...contact, message: " " }]) {
    assert.equal((await request("/api/contact", "POST", invalid)).status, 400);
  }
  assert.equal((await request("/api/contact", "POST", { ...contact, role: "admin", notification: "sent" })).status, 201);
  const cookie = await login();
  const records = await (await request("/api/admin/messages", "GET", undefined, cookie)).json();
  assert.equal(records.length, 1); assert.equal(records[0].subject, contact.subject); assert.equal(records[0].role, undefined); assert.equal(records[0].notification, "sent");
  assert.equal(sent.length, 1); assert.equal(sent[0].to, "owner@example.test"); assert.equal(sent[0].from, "portfolio@example.test"); assert.equal(sent[0].replyTo, contact.email); assert.match(sent[0].text, /Website question/);
});

test("honeypot discards spam and contact/inquiry routes share a submission limit", async (t) => {
  const { request, store } = await fixture(t, { contactLimit: 2 });
  assert.equal((await request("/api/contact", "POST", { ...contact, website: "spam.example" })).status, 201);
  assert.equal((await store.read()).messages.length, 0);
  assert.equal((await request("/api/inquiries", "POST", inquiry)).status, 201);
  assert.equal((await request("/api/contact", "POST", contact)).status, 429);
});

test("inquiries validate, persist, expose protected details, change status and delete", async (t) => {
  const { request, login, store } = await fixture(t);
  assert.equal((await request("/api/inquiries", "POST", { ...inquiry, projectType: [] })).status, 400);
  assert.equal((await request("/api/inquiries", "POST", { ...inquiry, status: "Completed" })).status, 201);
  assert.equal((await request("/api/admin/inquiries")).status, 401);
  const cookie = await login();
  const saved = (await (await request("/api/admin/inquiries", "GET", undefined, cookie)).json())[0];
  assert.equal(saved.status, "New"); assert.equal(saved.company, "Acme"); assert.ok(saved.createdAt);
  const route = `/api/admin/inquiries/${saved.id}`;
  assert.equal((await request(route)).status, 401);
  assert.equal((await request(route, "PATCH", { status: "Contacted" })).status, 401);
  assert.equal((await request(route, "DELETE")).status, 401);
  assert.equal((await request(route, "PATCH", { status: "Invalid" }, cookie)).status, 400);
  for (const status of ["Contacted", "In Progress", "Completed", "Rejected"]) {
    assert.equal((await request(route, "PATCH", { status }, cookie)).status, 200);
    assert.equal((await store.read()).inquiries[0].status, status);
  }
  assert.equal((await (await request(route, "GET", undefined, cookie)).json()).name, inquiry.name);
  assert.equal((await request(route, "DELETE", undefined, cookie)).status, 200);
  assert.equal((await request(route, "GET", undefined, cookie)).status, 404);
});

test("email failures preserve saved submissions and can be retried after SMTP recovers", async (t) => {
  let failed = true;
  const notifier = createNotifier({ env: { SMTP_FROM: "portfolio@example.test", NOTIFICATION_EMAIL: "owner@example.test" }, transport: { async sendMail() { if (failed) throw new Error("SMTP offline"); } } });
  const { request, login } = await fixture(t, { notifier });
  assert.equal((await request("/api/contact", "POST", contact)).status, 201);
  const cookie = await login();
  const record = (await (await request("/api/admin/messages", "GET", undefined, cookie)).json())[0];
  assert.equal(record.notification, "failed"); failed = false;
  const retry = `/api/admin/messages/${record.id}/notification`;
  assert.equal((await request(retry, "POST")).status, 401);
  assert.equal((await request(retry, "POST", undefined, cookie)).status, 200);
  assert.equal((await request(retry, "POST", undefined, cookie)).status, 409);
  assert.equal((await (await request(`/api/admin/messages/${record.id}`, "GET", undefined, cookie)).json()).notification, "sent");
});

test("analytics aggregates daily unique visits without IP, raw agent, or full referrer; honors DNT", async (t) => {
  const { request, login, store } = await fixture(t);
  const visit = { path: "/", visitorId: "random-visitor-123456789", referrer: "https://search.example/query?secret=private" };
  for (let i = 0; i < 2; i++) assert.equal((await request("/api/analytics/visit", "POST", visit, undefined, { "User-Agent": "Mozilla/5.0 iPhone Mobile Safari/605.1" })).status, 204);
  assert.equal((await request("/api/analytics/visit", "POST", visit, undefined, { DNT: "1" })).status, 204);
  assert.equal((await request("/api/analytics/visit", "POST", visit, undefined, { "Sec-GPC": "1" })).status, 204);
  for (const path of ["/admin", "/api/admin/session", "/?email=private"]) assert.equal((await request("/api/analytics/visit", "POST", { ...visit, path })).status, 400);
  assert.equal((await request("/api/admin/analytics")).status, 401);
  const cookie = await login();
  const stats = await (await request("/api/admin/analytics", "GET", undefined, cookie)).json();
  assert.equal(stats.totalVisits, 2); assert.equal(stats.dailyUniqueVisitors, 1); assert.deepEqual(stats.devices, [{ label: "Mobile", count: 2 }]);
  assert.deepEqual(stats.referrers, [{ label: "search.example", count: 2 }]);
  const stored = JSON.stringify((await store.read()).analytics);
  for (const privateData of [visit.visitorId, "secret=private", "Mozilla", "127.0.0.1"]) assert.ok(!stored.includes(privateData));
});

test("JWT rejects expired/tampered/incorrect audience tokens; logout revokes access", async (t) => {
  const { request, login } = await fixture(t);
  const cookie = await login();
  const token = cookie.slice("portfolio_admin=".length);
  const claims = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: "portfolio-backend", audience: "portfolio-admin" });
  assert.equal(claims.role, "admin"); assert.equal(claims.sub, "owner"); assert.ok(claims.exp > claims.iat);
  for (const options of [{ expiresIn: -1, audience: "portfolio-admin" }, { expiresIn: 60, audience: "other-service" }]) {
    const forged = jwt.sign({ username: claims.username, role: "admin", version: 0 }, secret, { issuer: "portfolio-backend", subject: "owner", jwtid: "test", ...options });
    assert.equal((await request("/api/admin/session", "GET", undefined, `portfolio_admin=${forged}`)).status, 401);
  }
  assert.equal((await request("/api/admin/session", "GET", undefined, cookie.slice(0, -3) + "bad")).status, 401);
  assert.equal((await request("/api/admin/logout", "POST", undefined, cookie)).status, 200);
  assert.equal((await request("/api/admin/session", "GET", undefined, cookie)).status, 401);
});

test("CORS rejects untrusted browser origins and Helmet headers protect API responses", async (t) => {
  const { request } = await fixture(t);
  const allowed = await request("/api/health", "GET", undefined, undefined, { Origin: "http://localhost:3000" });
  assert.equal(allowed.status, 200); assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");
  assert.equal(allowed.headers.get("X-Content-Type-Options"), "nosniff"); assert.ok(allowed.headers.get("Content-Security-Policy"));
  assert.equal((await request("/api/contact", "POST", contact, undefined, { Origin: "https://attacker.example" })).status, 403);
});

test("production refuses missing database/JWT settings and models reject invalid submissions", async () => {
  assert.throws(() => validateEnvironment({ NODE_ENV: "production" }), /MONGODB_URI/);
  assert.throws(() => validateEnvironment({ NODE_ENV: "production", MONGODB_URI: "mongodb://unused" }), /JWT_SECRET/);
  const connection = mongoose.createConnection();
  try {
    const { ProjectInquiry, Admin } = createModels(connection);
    await assert.rejects(new ProjectInquiry({ _id: "invalid", ...inquiry, status: "Other" }).validate(), { name: "ValidationError" });
    await assert.rejects(new Admin({ username: "owner@example.test", passwordHash: "plaintext" }).validate(), { name: "ValidationError" });
  } finally { await connection.close(); }
});
